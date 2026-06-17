const OPENF1_BASE = "https://api.openf1.org/v1";

function parseYear(raw: any, fallback = 2025) {
  const year = Number(raw || fallback);
  return Number.isFinite(year) ? year : fallback;
}

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store, no-cache, max-age=0, must-revalidate");

  const year = parseYear(req.query?.year);

  try {
    const response = await fetch(`${OPENF1_BASE}/sessions?year=${year}`);

    if (!response.ok) {
      throw new Error(`OpenF1 API returned HTTP ${response.status}`);
    }

    const data = await response.json();
    const now = new Date();
    const sourceSessions = Array.isArray(data) ? data : [];

    const sessions = sourceSessions
      .filter((session: any) => session.session_name === "Race")
      .filter((session: any) => new Date(session.date_start) <= now)
      .map((session: any) => ({
        session_key: session.session_key,
        session_name: session.session_name,
        session_type: session.session_type || session.session_name,
        meeting_key: session.meeting_key,
        meeting_name: session.meeting_name || `${session.location} Grand Prix`,
        location: session.location,
        country_name: session.country_name,
        year: session.year,
        date_start: session.date_start,
      }))
      .sort((a: any, b: any) => new Date(b.date_start).getTime() - new Date(a.date_start).getTime());

    return res.status(200).json({
      success: true,
      year,
      sessions,
      isDemo: false,
      source: "OpenF1 API",
      note: sessions.length ? "OpenF1 data loaded." : "OpenF1 returned no completed race sessions.",
    });
  } catch (error: any) {
    return res.status(200).json({
      success: true,
      year,
      sessions: [],
      isDemo: false,
      source: "OpenF1 API",
      error: error?.message || "OpenF1 API unavailable",
      note: "OpenF1 data did not load.",
    });
  }
}
