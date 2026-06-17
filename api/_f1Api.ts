const OPENF1_BASE = "https://api.openf1.org/v1";
const JOLPICA_BASE = "https://api.jolpi.ca/ergast/f1";

export function parseYear(raw: unknown, fallback = 2025) {
  const year = Number(raw || fallback);
  return Number.isFinite(year) ? year : fallback;
}

export async function fetchJson(url: string, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function getOpenF1Sessions(year: number) {
  const data = await fetchJson(`${OPENF1_BASE}/sessions?year=${year}`);
  if (!Array.isArray(data)) return [];

  return data
    .filter((session: any) => ["Race", "Qualifying", "Sprint", "Sprint Shootout", "Sprint Qualifying"].includes(session.session_name))
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
}

export async function getOpenF1SessionData(sessionKey: number) {
  const [sessions, drivers, weather, raceControl] = await Promise.all([
    fetchJson(`${OPENF1_BASE}/sessions?session_key=${sessionKey}`).catch(() => []),
    fetchJson(`${OPENF1_BASE}/drivers?session_key=${sessionKey}`).catch(() => []),
    fetchJson(`${OPENF1_BASE}/weather?session_key=${sessionKey}`).catch(() => []),
    fetchJson(`${OPENF1_BASE}/race_control?session_key=${sessionKey}`).catch(() => []),
  ]);

  const sessionInfo = Array.isArray(sessions) && sessions.length > 0 ? sessions[0] : null;
  if (!sessionInfo) {
    return null;
  }

  const formattedDrivers = (Array.isArray(drivers) ? drivers : []).map((driver: any) => ({
    driver_number: driver.driver_number,
    broadcast_name: driver.broadcast_name || driver.last_name || "Unknown",
    full_name: driver.full_name || `${driver.first_name || ""} ${driver.last_name || ""}`.trim() || driver.broadcast_name || "Unknown driver",
    name_acronym: driver.name_acronym || driver.broadcast_name?.substring(0, 3).toUpperCase() || "F1",
    team_name: driver.team_name || "F1 Team",
    team_colour: driver.team_colour || "E10600",
    headshot_url: driver.headshot_url || "https://media.formula1.com/d_driver_fallback_image.png",
  }));

  const uniqueDrivers = formattedDrivers.filter((driver: any, index: number, self: any[]) => (
    index === self.findIndex((item) => item.driver_number === driver.driver_number)
  ));

  const rawWeather = Array.isArray(weather) ? weather : [];
  const step = Math.max(1, Math.floor(rawWeather.length / 12));
  const formattedWeather = rawWeather.filter((_: any, index: number) => index % step === 0).map((item: any) => ({
    date: item.date,
    air_temperature: item.air_temperature,
    track_temperature: item.track_temperature,
    humidity: item.humidity,
    rainfall: item.rainfall,
  }));

  const formattedEvents = (Array.isArray(raceControl) ? raceControl : []).map((event: any) => ({
    date: event.date,
    lap_number: event.lap_number || null,
    category: event.category || "Status",
    message: event.message || "",
    flag: event.flag || null,
  })).slice(0, 30);

  return {
    session: {
      session_key: sessionInfo.session_key,
      session_name: sessionInfo.session_name,
      session_type: sessionInfo.session_type || sessionInfo.session_name,
      meeting_key: sessionInfo.meeting_key,
      meeting_name: sessionInfo.meeting_name || `${sessionInfo.location} Session`,
      location: sessionInfo.location,
      country_name: sessionInfo.country_name,
      year: sessionInfo.year,
      date_start: sessionInfo.date_start,
    },
    drivers: uniqueDrivers,
    weather: formattedWeather,
    events: formattedEvents,
    laps: {},
  };
}

export async function getOpenF1DriverLaps(sessionKey: number, driverNumber: number) {
  const data = await fetchJson(`${OPENF1_BASE}/laps?session_key=${sessionKey}&driver_number=${driverNumber}`);
  if (!Array.isArray(data)) return [];

  return data
    .map((lap: any) => ({
      lap_number: lap.lap_number,
      lap_duration: lap.lap_duration || null,
      duration_sector_1: lap.duration_sector_1 || null,
      duration_sector_2: lap.duration_sector_2 || null,
      duration_sector_3: lap.duration_sector_3 || null,
      is_pit_out_lap: lap.is_pit_out_lap === 1 || lap.is_pit_out_lap === true,
    }))
    .filter((lap: any) => lap.lap_duration && lap.lap_duration > 0);
}

export async function getJolpicaStandings(year: number) {
  const [driversData, constructorsData] = await Promise.all([
    fetchJson(`${JOLPICA_BASE}/${year}/driverStandings.json`).catch(() => null),
    fetchJson(`${JOLPICA_BASE}/${year}/constructorStandings.json`).catch(() => null),
  ]);

  const driverList = driversData?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings || [];
  const constructorList = constructorsData?.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings || [];

  return {
    drivers: driverList.map((item: any) => ({
      position: Number(item.position),
      points: Number(item.points),
      wins: Number(item.wins),
      driverName: `${item.Driver.givenName} ${item.Driver.familyName}`,
      driverAcronym: item.Driver.code || item.Driver.familyName.substring(0, 3).toUpperCase(),
      nationality: item.Driver.nationality,
      teamName: item.Constructors?.[0]?.name || "—",
    })),
    constructors: constructorList.map((item: any) => ({
      position: Number(item.position),
      points: Number(item.points),
      wins: Number(item.wins),
      teamName: item.Constructor.name,
      nationality: item.Constructor.nationality,
    })),
  };
}

export async function getJolpicaRaceResults(year: number) {
  const data = await fetchJson(`${JOLPICA_BASE}/${year}/results/1.json`);
  const races = data?.MRData?.RaceTable?.Races || [];

  return races.map((race: any) => {
    const winnerResult = race.Results?.[0];
    const winner = winnerResult ? `${winnerResult.Driver.givenName} ${winnerResult.Driver.familyName}` : "Победитель пока не указан";
    const winnerTeam = winnerResult?.Constructor?.name || "—";
    const winnerAcronym = winnerResult?.Driver?.code || winner.split(" ").map((part) => part[0]).join("").slice(0, 3).toUpperCase();

    return {
      round: Number(race.round),
      raceName: race.raceName,
      circuitName: race.Circuit?.circuitName || "—",
      locality: race.Circuit?.Location?.locality || "—",
      country: race.Circuit?.Location?.country || "—",
      date: race.date,
      winner,
      winnerAcronym,
      winnerTeam,
      time: winnerResult?.Time?.time || "Finished",
      simpleSummary: `Гонку выиграл ${winner}. Команда: ${winnerTeam}. Этап: ${race.raceName}.`,
    };
  });
}
