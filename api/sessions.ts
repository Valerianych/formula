import { getOpenF1Sessions, parseYear } from "./_f1Api";

export default async function handler(req: any, res: any) {
  const year = parseYear(req.query?.year);

  try {
    const sessions = await getOpenF1Sessions(year);
    return res.status(200).json({
      success: true,
      sessions,
      isDemo: false,
      source: "OpenF1 API",
      note: sessions.length ? "Данные получены с OpenF1 API." : "OpenF1 API не вернул сессии за выбранный сезон.",
    });
  } catch (error: any) {
    return res.status(200).json({
      success: true,
      sessions: [],
      isDemo: false,
      source: "OpenF1 API",
      error: error?.message || "OpenF1 API unavailable",
      note: "Данные не подменялись демо-набором. Внешний API сейчас не ответил.",
    });
  }
}
