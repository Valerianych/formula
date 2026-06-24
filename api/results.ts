const JOLPICA_BASE = "https://api.jolpi.ca/ergast/f1";

function parseYear(raw: any, fallback = 2025) {
  const year = Number(raw || fallback);
  return Number.isFinite(year) ? year : fallback;
}

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store, no-cache, max-age=0, must-revalidate");

  const year = parseYear(req.query?.year);

  try {
    const response = await fetch(`${JOLPICA_BASE}/${year}/results/1.json`);

    if (!response.ok) {
      throw new Error(`Jolpica API returned HTTP ${response.status}`);
    }

    const data = await response.json();
    const sourceRaces = data?.MRData?.RaceTable?.Races || [];

    const races = sourceRaces.map((race: any) => {
      const winnerResult = race.Results?.[0];
      const winner = winnerResult ? `${winnerResult.Driver.givenName} ${winnerResult.Driver.familyName}` : "Победитель не указан";
      const winnerTeam = winnerResult?.Constructor?.name || "Команда не указана";

      return {
        round: Number(race.round),
        raceName: race.raceName,
        circuitName: race.Circuit?.circuitName || "—",
        locality: race.Circuit?.Location?.locality || "—",
        country: race.Circuit?.Location?.country || "—",
        date: race.date,
        winner,
        winnerAcronym: winner,
        winnerTeam,
        time: winnerResult?.Time?.time || "—",
        winnerLine: `Победитель гонки: ${winner} (${winnerTeam})`,
        simpleSummary: `Гонку ${race.raceName} выиграл ${winner}. Команда: ${winnerTeam}.`,
      };
    });

    return res.status(200).json({
      success: true,
      year,
      source: "Jolpica API",
      races,
      note: races.length ? `Результаты гонок за ${year} год получены с Jolpica API.` : `Jolpica API не вернул результаты за ${year} год.`,
    });
  } catch (error: any) {
    return res.status(200).json({
      success: true,
      year,
      source: "Jolpica API",
      races: [],
      error: error?.message || "Jolpica API unavailable",
      note: `Данные за ${year} год не загрузились из Jolpica API.`,
    });
  }
}
