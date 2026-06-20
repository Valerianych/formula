import { randomUUID } from "node:crypto";
import { GoogleGenAI } from "@google/genai";

let gigaChatTokenCache: { token: string; expiresAt: number } | null = null;

function formatTime(sec: number | null) {
  if (!sec) return "—";
  const mins = Math.floor(sec / 60);
  const remainingSecs = (sec % 60).toFixed(3);
  return mins > 0 ? `${mins}:${remainingSecs.padStart(6, "0")}` : `${remainingSecs}с`;
}

function safeSliceJson(value: any, maxLength = 12_000) {
  const text = JSON.stringify(value, null, 2);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}\n...контекст обрезан, потому что он слишком большой...`;
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

async function generateWithGigaChat(prompt: string, chatMessages: Array<{ role: string; content?: string; text?: string }> = []) {
  const token = await getGigaChatAccessToken();
  if (!token) return null;

  const history = chatMessages
    .filter((message) => ["user", "assistant"].includes(message.role))
    .slice(-8)
    .map((message) => ({
      role: message.role,
      content: String(message.content || message.text || "").slice(0, 2000),
    }));

  const response = await fetch(`${process.env.GIGACHAT_API_BASE || "https://gigachat.devices.sberbank.ru/api/v1"}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      model: process.env.GIGACHAT_MODEL || "GigaChat",
      messages: [
        {
          role: "system",
          content:
            "Ты русскоязычный помощник по Формуле-1 внутри сайта аналитики гонок. Отвечай простым языком. Не выдумывай факты. Если данных нет в контексте OpenF1, прямо скажи, что данных нет. Если спрашивают кто накосячил, пиши аккуратно: возможный проблемный момент, Race Control отметил, по данным видно. Не обвиняй пилота без прямого события Race Control.",
        },
        ...history,
        { role: "user", content: prompt },
      ],
      temperature: 0.25,
    }),
  });

  if (!response.ok) {
    throw new Error(`GigaChat API returned ${response.status}`);
  }

  const payload = await response.json();
  return payload?.choices?.[0]?.message?.content || null;
}

function buildCompactContext(body: any) {
  if (body.raceContext) return body.raceContext;

  const { session, driver, laps, weather, events, issues, summary } = body;
  const validLaps = Array.isArray(laps) ? laps.filter((lap: any) => lap.lap_duration && lap.lap_duration > 0) : [];
  const lapTimes = validLaps.map((lap: any) => lap.lap_duration);
  const bestLap = lapTimes.length ? Math.min(...lapTimes) : null;
  const avgLap = lapTimes.length ? lapTimes.reduce((sum: number, value: number) => sum + value, 0) / lapTimes.length : null;
  const latestWeather = Array.isArray(weather) && weather.length ? weather[weather.length - 1] : null;

  return {
    session,
    selected_driver: driver,
    summary,
    driver_stats: driver
      ? {
          best_lap: bestLap,
          average_lap: avgLap,
          laps_with_time: validLaps.length,
        }
      : null,
    weather_latest: latestWeather,
    race_control_events_count: Array.isArray(events) ? events.length : 0,
    race_control_events: Array.isArray(events) ? events.slice(0, 20) : [],
    issues: Array.isArray(issues) ? issues.slice(0, 30) : [],
  };
}

function buildFallbackAnswer(context: any, question?: string) {
  const session = context.session || {};
  const driver = context.selected_driver || {};
  const stats = context.driver_stats || {};
  const weather = context.weather_latest;
  const issues = Array.isArray(context.issues) ? context.issues : [];

  return `### Ответ по данным API\n\nЭтап: **${session.meeting_name || "—"}**. ${driver.full_name ? `Выбран пилот: **${driver.full_name}** (${driver.team_name || "—"}).` : "Пилот не выбран."}\n\nЛучший круг: **${formatTime(stats.best_lap)}**. Средний темп: **${formatTime(stats.average_lap)}**. Кругов с временем: **${stats.laps_with_time ?? "—"}**.\n\n${weather ? `Погода OpenF1: трасса **${weather.track_temperature}°C**, воздух **${weather.air_temperature}°C**, влажность **${weather.humidity}%**.` : "Погодные данные OpenF1 не загружены."}\n\nСобытий Race Control: **${context.race_control_events_count ?? 0}**. Возможных проблемных моментов: **${issues.length}**.\n\n${question ? `Вопрос: **${question}**\n\nGigaChat сейчас недоступен, поэтому показан только безопасный ответ по загруженным API-данным без выдуманных фактов.` : "GigaChat сейчас недоступен, но основные данные сайт показывает без него."}`;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Метод не поддерживается" });
  }

  const body = req.body || {};
  const question = String(body.question || body.message || "Сделай короткий комментарий по выбранной гонке");
  const context = buildCompactContext(body);

  if (!context?.session && !context?.summary) {
    return res.status(400).json({ success: false, error: "Нет контекста гонки для ИИ-чата" });
  }

  const prompt = `Ответь на вопрос пользователя по данным гонки.\n\nВопрос: ${question}\n\nКонтекст OpenF1/Jolpica:\n${safeSliceJson(context)}`;
  const fallback = buildFallbackAnswer(context, question);

  try {
    const gigaChatText = await generateWithGigaChat(prompt, body.messages || []);
    if (gigaChatText) {
      return res.status(200).json({ success: true, provider: "GigaChat", analysis: gigaChatText, answer: gigaChatText });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(200).json({ success: true, provider: "factual-fallback", analysis: fallback, answer: fallback });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-3.5-flash",
      contents: prompt,
    });

    return res.status(200).json({ success: true, provider: "Gemini", analysis: response.text || fallback, answer: response.text || fallback });
  } catch {
    return res.status(200).json({ success: true, provider: "factual-fallback", analysis: fallback, answer: fallback });
  }
}
