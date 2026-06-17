import { randomUUID } from "node:crypto";
import { GoogleGenAI } from "@google/genai";

let gigaChatTokenCache: { token: string; expiresAt: number } | null = null;

function formatTime(sec: number | null) {
  if (!sec) return "—";
  const mins = Math.floor(sec / 60);
  const remainingSecs = (sec % 60).toFixed(3);
  return mins > 0 ? `${mins}:${remainingSecs.padStart(6, "0")}` : `${remainingSecs}с`;
}

async function getGigaChatAccessToken() {
  if (process.env.GIGACHAT_ACCESS_TOKEN) {
    return process.env.GIGACHAT_ACCESS_TOKEN;
  }

  if (gigaChatTokenCache && Date.now() < gigaChatTokenCache.expiresAt - 60_000) {
    return gigaChatTokenCache.token;
  }

  const authorizationKey = process.env.GIGACHAT_AUTH_KEY || process.env.GIGACHAT_CREDENTIALS;
  if (!authorizationKey) return null;

  const response = await fetch(process.env.GIGACHAT_OAUTH_URL || "https://ngw.devices.sberbank.ru:9443/api/v2/oauth", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      RqUID: randomUUID(),
      Authorization: `Basic ${authorizationKey}`,
    },
    body: new URLSearchParams({ scope: process.env.GIGACHAT_SCOPE || "GIGACHAT_API_PERS" }),
  });

  if (!response.ok) {
    throw new Error(`GigaChat OAuth returned ${response.status}`);
  }

  const payload = await response.json();
  if (!payload?.access_token) {
    throw new Error("GigaChat OAuth did not return access_token");
  }

  gigaChatTokenCache = {
    token: payload.access_token,
    expiresAt: payload.expires_at ? Number(payload.expires_at) : Date.now() + 25 * 60_000,
  };

  return gigaChatTokenCache.token;
}

async function generateWithGigaChat(prompt: string) {
  const token = await getGigaChatAccessToken();
  if (!token) return null;

  const response = await fetch(`${process.env.GIGACHAT_API_BASE || "https://gigachat.devices.sberbank.ru/api/v1"}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      model: process.env.GIGACHAT_MODEL || "GigaChat",
      messages: [
        { role: "system", content: "Ты русскоязычный комментатор Формулы-1. Не выдумывай факты, используй только данные из запроса." },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    throw new Error(`GigaChat API returned ${response.status}`);
  }

  const payload = await response.json();
  return payload?.choices?.[0]?.message?.content || null;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Метод не поддерживается" });
  }

  const { session, driver, laps, weather, events, question } = req.body || {};
  if (!session || !driver) {
    return res.status(400).json({ success: false, error: "Нет данных сессии или пилота" });
  }

  const validLaps = Array.isArray(laps) ? laps.filter((lap: any) => lap.lap_duration && lap.lap_duration > 0) : [];
  const lapTimes = validLaps.map((lap: any) => lap.lap_duration);
  const bestLap = lapTimes.length ? Math.min(...lapTimes) : null;
  const avgLap = lapTimes.length ? lapTimes.reduce((sum: number, value: number) => sum + value, 0) / lapTimes.length : null;
  const latestWeather = Array.isArray(weather) && weather.length ? weather[weather.length - 1] : null;
  const eventCount = Array.isArray(events) ? events.length : 0;

  const factualFallback = `### Комментарий по данным API\n\nЭтап: **${session.meeting_name}**. Пилот: **${driver.full_name}** (${driver.team_name}).\n\nЛучший круг: **${formatTime(bestLap)}**. Средний темп: **${formatTime(avgLap)}**. Кругов с временем: **${validLaps.length}**.\n\n${latestWeather ? `Погода OpenF1: трасса **${latestWeather.track_temperature}°C**, воздух **${latestWeather.air_temperature}°C**, влажность **${latestWeather.humidity}%**.` : "Погодные данные OpenF1 не загружены."}\n\nСобытий Race Control: **${eventCount}**.${question ? `\n\nВопрос зрителя: **${question}**\n\nОтвет: по доступным API-данным можно комментировать только загруженные круги, погоду и события Race Control; сгенерированные факты не добавлялись.` : ""}`;

  const prompt = `Ты — русскоязычный AI-комментатор Формулы-1. Отвечай как live-комментатор, но не выдумывай факты: используй только переданные API-данные. Если данных мало, честно скажи чего не хватает.\nВопрос зрителя: ${question || "Сделай короткий комментарий по текущей сессии"}\nЭтап: ${session.meeting_name}\nТрасса: ${session.location}, ${session.country_name}\nПилот: ${driver.full_name}\nКоманда: ${driver.team_name}\nЛучший круг: ${formatTime(bestLap)}\nСредний темп: ${formatTime(avgLap)}\nКругов с временем: ${validLaps.length}\nПогода: ${latestWeather ? `${latestWeather.track_temperature}°C трасса, ${latestWeather.air_temperature}°C воздух, влажность ${latestWeather.humidity}%` : "нет данных"}\nСобытия Race Control: ${eventCount}`;

  try {
    const gigaChatText = await generateWithGigaChat(prompt);
    if (gigaChatText) {
      return res.status(200).json({ success: true, provider: "GigaChat", analysis: gigaChatText });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(200).json({
        success: true,
        provider: "factual-fallback",
        analysis: factualFallback,
      });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-3.5-flash",
      contents: prompt,
    });

    return res.status(200).json({ success: true, provider: "Gemini", analysis: response.text || "Не удалось сделать анализ." });
  } catch (error: any) {
    return res.status(200).json({
      success: true,
      provider: "factual-fallback",
      analysis: factualFallback,
    });
  }
}
