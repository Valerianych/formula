import { getJolpicaRaceResults, getOpenF1RaceDashboard } from "./_f1Api.ts";

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
    const data = await getOpenF1RaceDashboard(sessionKey);

    if (!data?.session) {
      return res.status(404).json({
        success: false,
        isDemo: false,
        source: "OpenF1 API",
        data: null,
        error: "OpenF1 не вернул данные по этой сессии",
        note: "Фейковые данные отключены.",
      });
    }

    const races = await getJolpicaRaceResults(data.session.year).catch(() => []);
    const result = findResult(data.session, races);

    if (result) {
      data.session = {
        ...data.session,
        winner: result.winner,
        winnerTeam: result.winnerTeam,
        winnerTime: result.time,
        winnerLine: `Победитель гонки: ${result.winner} (${result.winnerTeam})`,
      } as any;
    }

    return res.status(200).json({
      success: true,
      isDemo: false,
      source: "OpenF1 API + Jolpica API",
      data,
      note: "Данные загружены из OpenF1. Если отдельный блок пустой, значит OpenF1 не вернул этот тип данных для выбранной гонки.",
    });
  } catch (error: any) {
    return res.status(502).json({
      success: false,
      isDemo: false,
      source: "OpenF1 API + Jolpica API",
      data: null,
      error: error?.message || "F1 API unavailable",
      note: "Фейковые данные не использовались.",
    });
  }
}
