import { GoogleGenAI } from "@google/genai";

function formatTime(sec: number | null) {
  if (!sec) return "—";
  const mins = Math.floor(sec / 60);
  const remainingSecs = (sec % 60).toFixed(3);
  return mins > 0 ? `${mins}:${remainingSecs.padStart(6, "0")}` : `${remainingSecs}с`;
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

  if (!process.env.GEMINI_API_KEY) {
    return res.status(200).json({
      success: true,
      analysis: factualFallback,
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-3.5-flash",
      contents: `Ты — русскоязычный AI-комментатор Формулы-1. Отвечай как live-комментатор, но не выдумывай факты: используй только переданные API-данные. Если данных мало, честно скажи чего не хватает.\nВопрос зрителя: ${question || "Сделай короткий комментарий по текущей сессии"}\nЭтап: ${session.meeting_name}\nТрасса: ${session.location}, ${session.country_name}\nПилот: ${driver.full_name}\nКоманда: ${driver.team_name}\nЛучший круг: ${formatTime(bestLap)}\nСредний темп: ${formatTime(avgLap)}\nКругов с временем: ${validLaps.length}\nПогода: ${latestWeather ? `${latestWeather.track_temperature}°C трасса, ${latestWeather.air_temperature}°C воздух, влажность ${latestWeather.humidity}%` : "нет данных"}\nСобытия Race Control: ${eventCount}`,
    });

    return res.status(200).json({ success: true, analysis: response.text || "Не удалось сделать анализ." });
  } catch (error: any) {
    return res.status(200).json({
      success: true,
      analysis: factualFallback,
    });
  }
}
