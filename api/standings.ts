import { getJolpicaStandings, parseYear } from "./_f1Api";

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store, no-cache, max-age=0, must-revalidate");

  const year = parseYear(req.query?.year);

  try {
    const standings = await getJolpicaStandings(year);
    const seasonLeader = standings.drivers?.[0]
      ? `Лидер сезона: ${standings.drivers[0].driverName} (${standings.drivers[0].teamName}) — ${standings.drivers[0].points} очков`
      : "Лидер сезона не найден";

    return res.status(200).json({
      success: true,
      year,
      source: "Jolpica API",
      drivers: standings.drivers,
      constructors: standings.constructors,
      seasonLeader,
      note: `Таблицы за ${year} год получены с внешнего API.`,
    });
  } catch (error: any) {
    return res.status(200).json({
      success: true,
      year,
      source: "Jolpica API",
      drivers: [],
      constructors: [],
      seasonLeader: "Лидер сезона не найден",
      error: error?.message || "External API unavailable",
      note: `Данные за ${year} год не подменялись локальным набором. Внешний API сейчас не ответил.`,
    });
  }
}
