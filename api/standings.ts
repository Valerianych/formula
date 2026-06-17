const JOLPICA_BASE = "https://api.jolpi.ca/ergast/f1";

function parseYear(raw: any, fallback = 2025) {
  const year = Number(raw || fallback);
  return Number.isFinite(year) ? year : fallback;
}

async function getJson(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Jolpica API returned HTTP ${response.status}`);
  }
  return response.json();
}

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store, no-cache, max-age=0, must-revalidate");

  const year = parseYear(req.query?.year);

  try {
    const [driversData, constructorsData] = await Promise.all([
      getJson(`${JOLPICA_BASE}/${year}/driverStandings.json`),
      getJson(`${JOLPICA_BASE}/${year}/constructorStandings.json`),
    ]);

    const driverList = driversData?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings || [];
    const constructorList = constructorsData?.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings || [];

    const drivers = driverList.map((item: any) => ({
      position: Number(item.position),
      points: Number(item.points),
      wins: Number(item.wins),
      driverName: `${item.Driver.givenName} ${item.Driver.familyName}`,
      driverAcronym: item.Driver.code || item.Driver.familyName.substring(0, 3).toUpperCase(),
      nationality: item.Driver.nationality,
      teamName: item.Constructors?.[0]?.name || "—",
    }));

    const constructors = constructorList.map((item: any) => ({
      position: Number(item.position),
      points: Number(item.points),
      wins: Number(item.wins),
      teamName: item.Constructor.name,
      nationality: item.Constructor.nationality,
    }));

    const seasonLeader = drivers[0]
      ? `Лидер сезона: ${drivers[0].driverName} (${drivers[0].teamName}) — ${drivers[0].points} очков`
      : "Лидер сезона не найден";

    return res.status(200).json({
      success: true,
      year,
      source: "Jolpica API",
      drivers,
      constructors,
      seasonLeader,
      note: `Таблицы за ${year} год получены с Jolpica API.`,
    });
  } catch (error: any) {
    return res.status(200).json({
      success: true,
      year,
      source: "Jolpica API",
      drivers: [],
      constructors: [],
      seasonLeader: "Лидер сезона не найден",
      error: error?.message || "Jolpica API unavailable",
      note: `Данные за ${year} год не загрузились из Jolpica API.`,
    });
  }
}
