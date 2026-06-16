import { getJolpicaRaceResults, parseYear } from "./_f1Api";

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store, no-cache, max-age=0, must-revalidate");

  const year = parseYear(req.query?.year);

  try {
    const races = await getJolpicaRaceResults(year);
    const readableRaces = races.map((race: any) => ({
      ...race,
      winnerAcronym: race.winner,
      winnerLine: `Победитель гонки: ${race.winner} (${race.winnerTeam})`,
      simpleSummary: `Гонку ${race.raceName} выиграл ${race.winner}. Команда: ${race.winnerTeam}.`,
    }));

    return res.status(200).json({
      success: true,
      year,
      source: "Jolpica API",
      races: readableRaces,
      note: readableRaces.length ? `Результаты гонок за ${year} год получены с Jolpica API.` : `Jolpica API не вернул результаты за ${year} год.`,
    });
  } catch (error: any) {
    return res.status(200).json({
      success: true,
      year,
      source: "Jolpica API",
      races: [],
      error: error?.message || "Jolpica API unavailable",
      note: `Данные за ${year} год не подменялись демо-набором. Внешний API сейчас не ответил.`,
    });
  }
}
