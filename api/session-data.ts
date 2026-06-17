import { getJolpicaRaceResults, getOpenF1SessionData } from "./_f1Api.ts";

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
  res.setHeader("Cache-Control", "no-store, no-cache, max-age=0, must-revalidate");

  const sessionKey = Number(req.query?.session_key);

  if (!Number.isFinite(sessionKey)) {
    return res.status(400).json({ success: false, error: "Параметр session_key обязателен" });
  }

  try {
    const data = await getOpenF1SessionData(sessionKey);

    if (data?.session) {
      const races = await getJolpicaRaceResults(data.session.year).catch(() => []);
      const result = findResult(data.session, races);

      if (result) {
        const winnerLine = `Победитель гонки: ${result.winner} (${result.winnerTeam})`;

        data.session = {
          ...data.session,
          meeting_name: `${result.raceName} - ${winnerLine}`,
          winner: result.winner,
          winnerTeam: result.winnerTeam,
          winnerTime: result.time,
          winnerLine,
        } as any;

        data.events = [
          {
            date: result.date,
            lap_number: null,
            category: "Result",
            message: winnerLine,
            flag: "CHEQUERED",
          },
          ...(data.events || []),
        ];
      }
    }

    return res.status(200).json({
      success: true,
      isDemo: false,
      source: "OpenF1 API + Jolpica API",
      data: data || { session: null, drivers: [], weather: [], events: [], laps: {} },
      note: data ? "Session data is loaded from OpenF1. Race winner is loaded from Jolpica." : "OpenF1 did not return data for this session.",
    });
  } catch (error: any) {
    return res.status(200).json({
      success: true,
      isDemo: false,
      source: "OpenF1 API + Jolpica API",
      data: { session: null, drivers: [], weather: [], events: [], laps: {} },
      error: error?.message || "F1 API unavailable",
      note: "No demo data was used.",
    });
  }
}
