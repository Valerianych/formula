import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { ensureDatabase } from "./src/db/f1Sqlite.js";
import { registerDatabaseRoutes } from "./src/db/f1Routes.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({ limit: "2mb" }));

ensureDatabase();
registerDatabaseRoutes(app);

let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is not defined");
    }
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

function formatTime(sec: number | null) {
  if (!sec) return "-";
  const mins = Math.floor(sec / 60);
  const remainingSecs = (sec % 60).toFixed(3);
  return mins > 0 ? `${mins}:${remainingSecs.padStart(6, "0")}` : `${remainingSecs}с`;
}

app.post("/api/analyze", async (req, res) => {
  const { session, driver, laps, weather, events } = req.body;

  if (!session || !driver) {
    return res.status(400).json({ error: "Отсутствуют детали сессии или пилота для анализа" });
  }

  const validLaps = Array.isArray(laps) ? laps.filter((lap: any) => lap.lap_duration && lap.lap_duration > 0) : [];
  const lapDurations = validLaps.map((lap: any) => lap.lap_duration);
  const bestLap = lapDurations.length > 0 ? Math.min(...lapDurations) : null;
  const avgLap = lapDurations.length > 0 ? lapDurations.reduce((a: number, b: number) => a + b, 0) / lapDurations.length : null;
  const weatherList = Array.isArray(weather) ? weather : [];
  const eventList = Array.isArray(events) ? events : [];

  try {
    const ai = getGeminiClient();
    const weatherText = weatherList.length > 0
      ? weatherList.map((w: any) => `Т возд: ${w.air_temperature}°C, Т трассы: ${w.track_temperature}°C, Влажн: ${w.humidity}%, Осадки: ${w.rainfall}`).slice(-3).join("; ")
      : "Информация об осадках и температуре отсутствует.";

    const eventsText = eventList.length > 0
      ? eventList.map((e: any) => `[Круг ${e.lap_number || "н/д"}]: ${e.message}`).join("\n")
      : "Событий безопасности или инцидентов не зафиксировано.";

    const prompt = `
Ты — ИИ-аналитик Формулы-1. Проанализируй данные из локальной SQLite-базы и объясни их простому зрителю на русском языке.

Гран-при: ${session.meeting_name} (${session.year})
Трасса: ${session.location}, ${session.country_name}
Сессия: ${session.session_name}
Пилот: ${driver.full_name} #${driver.driver_number}
Команда: ${driver.team_name}
Всего кругов: ${validLaps.length}
Лучший круг: ${formatTime(bestLap)}
Средний темп: ${formatTime(avgLap)}
Погода: ${weatherText}
События: ${eventsText}

Сделай 4 коротких раздела: общий обзор, темп пилота, влияние погоды/событий, вывод для зрителя. Используй понятные термины F1: деградация резины, апекс, DRS, undercut, прогрев шин.
`;

    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-3.5-flash",
      contents: prompt,
    });

    return res.json({ success: true, analysis: response.text || "Не удалось сгенерировать ИИ-обзор." });
  } catch (err: any) {
    console.warn("Gemini analysis unavailable:", err?.message || err);
    return res.json({
      success: true,
      analysis: `### 🏁 Локальный анализ SQLite\n\nИИ-анализ сейчас недоступен, но данные успешно получены из локальной базы.\n\nПилот **${driver.full_name}** выступает на трассе **${session.location}**. Лучший круг: **${formatTime(bestLap)}**, средний темп: **${formatTime(avgLap)}**. Эти показатели можно использовать для сравнения с другими пилотами и анализа стабильности темпа по ходу сессии.`,
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting SQLite server in DEVELOPMENT mode with Vite middleware...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting SQLite server in PRODUCTION mode with built static assets...");
    const distPath = typeof __dirname !== "undefined" ? __dirname : path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`F1 AI Analyst SQLite Server running on http://localhost:${PORT}`);
  });
}

startServer();
