import { getOpenF1RaceDashboard } from "./_f1Api.ts";

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store, no-cache, max-age=0, must-revalidate");

  const sessionKey = Number(req.query?.session_key);
  if (!Number.isFinite(sessionKey)) {
    return res.status(400).json({ success: false, error: "Параметр session_key обязателен" });
  }

  try {
    const data = await getOpenF1RaceDashboard(sessionKey);
    if (!data?.session) {
      return res.status(404).json({
        success: false,
        data: null,
        source: "OpenF1 API",
        error: "OpenF1 не вернул данные по этой сессии",
        note: "Фейковые данные отключены.",
      });
    }

    return res.status(200).json({
      success: true,
      source: "OpenF1 API",
      data,
      note: "Полный пакет гонки: итог, пилоты, круги, пит-стопы, шины, позиции, карта, инциденты и вычисленные проблемные моменты.",
    });
  } catch (error: any) {
    return res.status(502).json({
      success: false,
      data: null,
      source: "OpenF1 API",
      error: error?.message || "OpenF1 API unavailable",
      note: "Фейковые данные не использовались.",
    });
  }
}
