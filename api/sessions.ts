import { getJolpicaRaceResults, getOpenF1Sessions, parseYear } from "./_f1Api";

function norm(value: any) {
  return String(value || "")
    .toLowerCase()
    .split("grand prix").join("")
    .split("race").join("")
    .split(" ").join("")
    .split("-").join("")
    .split("_").join("")
    .trim();
}

function findResult(session: any, races: any[]) {
  const sessionText = norm(`${session.meeting_name}${session.location}${session.country_name}`);

  for (const race of races) {
    const raceText = norm(`${race.raceName}${race.locality}${race.country}`);
    const raceLocality = norm(race.locality);
    if (sessionText.includes(raceText) || raceText.includes(norm(session.meeting_name)) || sessionText.includes(raceLocality)) {
      return race;
    }
  }

  return null;
}

export default async function handler(req: any, res: any) {
  const year = parseYear(req.query?.year);

  try {
    const sessions = await getOpenF1Sessions(year);
    const races = await getJolpicaRaceResults(year).catch(() => []);
    const now = new Date();
    const raceSessions = [];

    for (const session of sessions) {
      if (session.session_name !== "Race") continue;
      if (new Date(session.date_start) > now) continue;

      const result = findResult(session, races);
      if (!result) continue;

      raceSessions.push({
        ...session,
        meeting_name: `${result.raceName} (${year})`,
        session_name: `Race - winner: ${result.winner}`,
        winner: result.winner,
        winnerTeam: result.winnerTeam,
        winnerTime: result.time,
      });
    }

    return res.status(200).json({
      success: true,
      sessions: raceSessions,
      isDemo: false,
      source: "OpenF1 API + Jolpica API",
      note: raceSessions.length ? "Only completed race sessions with winners are shown." : "No completed races with winners found.",
    });
  } catch (error: any) {
    return res.status(200).json({
      success: true,
      sessions: [],
      isDemo: false,
      source: "OpenF1 API + Jolpica API",
      error: error?.message || "F1 API unavailable",
      note: "No demo data was used.",
    });
  }
}
