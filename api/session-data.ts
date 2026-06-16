import { getOpenF1SessionData } from "./_f1Api";

export default async function handler(req: any, res: any) {
  const sessionKey = Number(req.query?.session_key);

  if (!Number.isFinite(sessionKey)) {
    return res.status(400).json({ success: false, error: "Параметр session_key обязателен" });
  }

  try {
    const data = await getOpenF1SessionData(sessionKey);
    return res.status(200).json({
      success: true,
      isDemo: false,
      source: "OpenF1 API",
      data: data || { session: null, drivers: [], weather: [], events: [], laps: {} },
      note: data ? "Данные получены с OpenF1 API." : "OpenF1 API не вернул данные по этой сессии.",
    });
  } catch (error: any) {
    return res.status(200).json({
      success: true,
      isDemo: false,
      source: "OpenF1 API",
      data: { session: null, drivers: [], weather: [], events: [], laps: {} },
      error: error?.message || "OpenF1 API unavailable",
      note: "Данные не подменялись демо-набором. Внешний API сейчас не ответил.",
    });
  }
}
