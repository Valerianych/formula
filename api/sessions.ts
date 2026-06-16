import { getOpenF1Sessions, parseYear } from "./_f1Api";

export default async function handler(req: any, res: any) {
  const year = parseYear(req.query?.year);

  try {
    const sessions = await getOpenF1Sessions(year);
    const now = new Date();
    const raceSessions = sessions.filter((session: any) => {
      return session.session_name === "Race" && new Date(session.date_start) <= now;
    });

    return res.status(200).json({
      success: true,
      sessions: raceSessions,
      isDemo: false,
      source: "OpenF1 API",
      note: raceSessions.length ? "Only completed race sessions are shown." : "No completed race sessions found.",
    });
  } catch (error: any) {
    return res.status(200).json({
      success: true,
      sessions: [],
      isDemo: false,
      source: "OpenF1 API",
      error: error?.message || "OpenF1 API unavailable",
      note: "No demo data was used.",
    });
  }
}
