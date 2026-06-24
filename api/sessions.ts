import { getOpenF1Sessions, parseYear } from "./_f1Api.ts";

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store, no-cache, max-age=0, must-revalidate");

  const year = parseYear(req.query?.year);

  try {
    const sessions = await getOpenF1Sessions(year);

    return res.status(200).json({
      success: true,
      year,
      sessions,
      isDemo: false,
      source: "OpenF1 API",
      note: sessions.length ? "OpenF1 race sessions loaded." : "OpenF1 не вернул завершённые Race-сессии за этот год.",
    });
  } catch (error: any) {
    return res.status(502).json({
      success: false,
      year,
      sessions: [],
      isDemo: false,
      source: "OpenF1 API",
      error: error?.message || "OpenF1 API unavailable",
      note: "Фейковые гонки не использовались.",
    });
  }
}
