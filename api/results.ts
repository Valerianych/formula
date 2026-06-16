import { getJolpicaRaceResults, parseYear } from "./_f1Api";

export default async function handler(req: any, res: any) {
  const year = parseYear(req.query?.year);

  try {
    const races = await getJolpicaRaceResults(year);
    return res.status(200).json({
      success: true,
      year,
      source: "Jolpica API",
      races,
      note: races.length ? "Результаты гонок получены с Jolpica API." : "Jolpica API не вернул результаты за выбранный сезон.",
    });
  } catch (error: any) {
    return res.status(200).json({
      success: true,
      year,
      source: "Jolpica API",
      races: [],
      error: error?.message || "Jolpica API unavailable",
      note: "Данные не подменялись демо-набором. Внешний API сейчас не ответил.",
    });
  }
}
