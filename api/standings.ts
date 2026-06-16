import { getJolpicaStandings, parseYear } from "./_f1Api";

export default async function handler(req: any, res: any) {
  const year = parseYear(req.query?.year);

  try {
    const standings = await getJolpicaStandings(year);
    return res.status(200).json({
      success: true,
      year,
      source: "Jolpica API",
      drivers: standings.drivers,
      constructors: standings.constructors,
      note: "Таблицы получены с внешнего API.",
    });
  } catch (error: any) {
    return res.status(200).json({
      success: true,
      year,
      source: "Jolpica API",
      drivers: [],
      constructors: [],
      error: error?.message || "External API unavailable",
      note: "Данные не подменялись локальным набором. Внешний API сейчас не ответил.",
    });
  }
}
