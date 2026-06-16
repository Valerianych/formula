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

  const { session, driver, laps, weather, events } = req.body || {};
  if (!session || !driver) {
    return res.status(400).json({ success: false, error: "Нет данных сессии или пилота" });
  }

  const validLaps = Array.isArray(laps) ? laps.filter((lap: any) => lap.lap_duration && lap.lap_duration > 0) : [];
  const lapTimes = validLaps.map((lap: any) => lap.lap_duration);
  const bestLap = lapTimes.length ? Math.min(...lapTimes) : null;
  const avgLap = lapTimes.length ? lapTimes.reduce((sum: number, value: number) => sum + value, 0) / lapTimes.length : null;
  const latestWeather = Array.isArray(weather) && weather.length ? weather[weather.length - 1] : null;
  const eventCount = Array.isArray(events) ? events.length : 0;

  if (!process.env.GEMINI_API_KEY) {
    return res.status(200).json({
      success: true,
      analysis: `### Простое объяснение\n\nВыбран этап **${session.meeting_name}**. Пилот **${driver.full_name}** выступает за команду **${driver.team_name}**.\n\nЛучший круг пилота: **${formatTime(bestLap)}**. Средний темп: **${formatTime(avgLap)}**.\n\n${latestWeather ? `Температура трассы: **${latestWeather.track_temperature}°C**, воздух: **${latestWeather.air_temperature}°C**.` : "Погодные данные не загружены."}\n\nСобытий Race Control: **${eventCount}**.`,
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-3.5-flash",
      contents: `Объясни простым языком данные Формулы-1. Без сложных терминов, коротко и понятно.\nЭтап: ${session.meeting_name}\nТрасса: ${session.location}, ${session.country_name}\nПилот: ${driver.full_name}\nКоманда: ${driver.team_name}\nЛучший круг: ${formatTime(bestLap)}\nСредний темп: ${formatTime(avgLap)}\nПогода: ${latestWeather ? `${latestWeather.track_temperature}°C трасса, ${latestWeather.air_temperature}°C воздух` : "нет данных"}\nСобытия гонки: ${eventCount}`,
    });

    return res.status(200).json({ success: true, analysis: response.text || "Не удалось сделать анализ." });
  } catch (error: any) {
    return res.status(200).json({
      success: true,
      analysis: `### Простое объяснение\n\nВыбран этап **${session.meeting_name}**. Пилот **${driver.full_name}** выступает за команду **${driver.team_name}**.\n\nЛучший круг пилота: **${formatTime(bestLap)}**. Средний темп: **${formatTime(avgLap)}**.\n\nИИ-анализ сейчас недоступен, но основные данные сайт показывает без него.`,
    });
  }
}
