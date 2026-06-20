const OPENF1_BASE = "https://api.openf1.org/v1";
const JOLPICA_BASE = "https://api.jolpi.ca/ergast/f1";

export function parseYear(raw: unknown, fallback = 2025) {
  const year = Number(raw || fallback);
  return Number.isFinite(year) ? year : fallback;
}

function compact<T>(items: T[], maxItems: number): T[] {
  if (!Array.isArray(items) || items.length <= maxItems) return items || [];
  const step = Math.ceil(items.length / maxItems);
  return items.filter((_, index) => index % step === 0).slice(0, maxItems);
}

function average(values: number[]) {
  const valid = values.filter((value) => Number.isFinite(value));
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null;
}

function median(values: number[]) {
  const valid = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (!valid.length) return null;
  const mid = Math.floor(valid.length / 2);
  return valid.length % 2 ? valid[mid] : (valid[mid - 1] + valid[mid]) / 2;
}

function minNumber(values: number[]) {
  const valid = values.filter((value) => Number.isFinite(value));
  return valid.length ? Math.min(...valid) : null;
}

function safeDate(value: any) {
  const time = new Date(value || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

export async function fetchJson(url: string, timeoutMs = 12_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal, cache: "no-store" as any });
    if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
    return await response.json();
  } catch (error: any) {
    if (error?.name === "AbortError") throw new Error(`${url} timed out after ${timeoutMs}ms`);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function optionalFetch(url: string, fallback: any[] = [], timeoutMs = 12_000) {
  try {
    const data = await fetchJson(url, timeoutMs);
    return Array.isArray(data) ? data : fallback;
  } catch {
    return fallback;
  }
}

function formatSession(session: any) {
  return {
    session_key: session.session_key,
    session_name: session.session_name,
    session_type: session.session_type || session.session_name,
    meeting_key: session.meeting_key,
    meeting_name: session.meeting_name || `${session.location || "Unknown"} Grand Prix`,
    location: session.location || "—",
    country_name: session.country_name || "—",
    circuit_short_name: session.circuit_short_name || session.location || "—",
    year: session.year,
    date_start: session.date_start,
    date_end: session.date_end,
    gmt_offset: session.gmt_offset,
  };
}

function formatDriver(driver: any, result: any, startGrid: any) {
  return {
    driver_number: Number(driver.driver_number),
    broadcast_name: driver.broadcast_name || driver.last_name || `#${driver.driver_number}`,
    full_name: driver.full_name || `${driver.first_name || ""} ${driver.last_name || ""}`.trim() || driver.broadcast_name || `Пилот #${driver.driver_number}`,
    first_name: driver.first_name || null,
    last_name: driver.last_name || null,
    name_acronym: driver.name_acronym || driver.broadcast_name?.substring(0, 3).toUpperCase() || `#${driver.driver_number}`,
    team_name: driver.team_name || "Команда не указана",
    team_colour: driver.team_colour || "666666",
    headshot_url: driver.headshot_url || "https://media.formula1.com/d_driver_fallback_image.png",
    starting_position: startGrid?.position ?? null,
    finishing_position: result?.position ?? null,
    classified_laps: result?.number_of_laps ?? null,
    gap_to_leader: result?.gap_to_leader ?? null,
    duration: result?.duration ?? null,
    dnf: Boolean(result?.dnf),
    dns: Boolean(result?.dns),
    dsq: Boolean(result?.dsq),
  };
}

function fallbackDriver(driverNumber: number, result: any, startGrid: any) {
  return formatDriver({ driver_number: driverNumber, full_name: `Пилот #${driverNumber}` }, result, startGrid);
}

function formatLap(lap: any) {
  return {
    driver_number: lap.driver_number,
    lap_number: lap.lap_number,
    lap_duration: lap.lap_duration ?? null,
    duration_sector_1: lap.duration_sector_1 ?? null,
    duration_sector_2: lap.duration_sector_2 ?? null,
    duration_sector_3: lap.duration_sector_3 ?? null,
    i1_speed: lap.i1_speed ?? null,
    i2_speed: lap.i2_speed ?? null,
    st_speed: lap.st_speed ?? null,
    is_pit_out_lap: lap.is_pit_out_lap === 1 || lap.is_pit_out_lap === true,
    date_start: lap.date_start ?? null,
  };
}

function formatPit(pit: any) {
  return { driver_number: pit.driver_number, lap_number: pit.lap_number ?? null, date: pit.date ?? null, lane_duration: pit.lane_duration ?? null, stop_duration: pit.stop_duration ?? null };
}

function formatStint(stint: any) {
  return { driver_number: stint.driver_number, stint_number: stint.stint_number, compound: stint.compound || "UNKNOWN", lap_start: stint.lap_start ?? null, lap_end: stint.lap_end ?? null, tyre_age_at_start: stint.tyre_age_at_start ?? null };
}

function formatEvent(event: any) {
  return { date: event.date, lap_number: event.lap_number ?? null, category: event.category || "Status", message: event.message || "", flag: event.flag ?? null, scope: event.scope ?? null, sector: event.sector ?? null, driver_number: event.driver_number ?? null };
}

function collectDriverNumbers(...groups: any[][]) {
  const numbers = new Set<number>();
  for (const group of groups) {
    for (const item of group || []) {
      for (const key of ["driver_number", "overtaking_driver_number", "overtaken_driver_number"]) {
        const value = Number(item?.[key]);
        if (Number.isFinite(value) && value > 0) numbers.add(value);
      }
    }
  }
  return Array.from(numbers).sort((a, b) => a - b);
}

function messageLooksLikeIssue(message: string) {
  return /penalty|investigation|noted|track limits|collision|unsafe release|false start|impeding|summon|deleted|warning|causing/i.test(message || "");
}

function buildIssue(driver: any, issue: any) {
  return { driver_number: driver.driver_number, driver_name: driver.full_name, team_name: driver.team_name, ...issue };
}

function buildDriverSummary(driver: any, data: any) {
  const driverLaps = data.laps.filter((lap: any) => lap.driver_number === driver.driver_number);
  const validLapTimes = driverLaps.filter((lap: any) => lap.lap_duration && lap.lap_duration > 0 && !lap.is_pit_out_lap).map((lap: any) => Number(lap.lap_duration));
  const driverPits = data.pitStops.filter((pit: any) => pit.driver_number === driver.driver_number);
  const pitDurations = driverPits.map((pit: any) => Number(pit.stop_duration ?? pit.lane_duration)).filter(Number.isFinite);
  const driverEvents = data.events.filter((event: any) => event.driver_number === driver.driver_number || (event.message || "").includes(driver.name_acronym));
  const driverStints = data.stints.filter((stint: any) => stint.driver_number === driver.driver_number);
  const driverPositions = compact(data.positions.filter((position: any) => position.driver_number === driver.driver_number).map((position: any) => ({ date: position.date, position: position.position })), 120);

  return {
    ...driver,
    laps_count: driverLaps.length,
    best_lap: minNumber(validLapTimes),
    average_lap: average(validLapTimes),
    median_lap: median(validLapTimes),
    pit_stop_count: driverPits.length,
    average_pit_stop: average(pitDurations),
    fastest_pit_stop: minNumber(pitDurations),
    pit_stops: driverPits,
    stints: driverStints,
    race_control_events: driverEvents,
    positions: driverPositions,
    position_delta: Number.isFinite(driver.starting_position) && Number.isFinite(driver.finishing_position) ? Number(driver.starting_position) - Number(driver.finishing_position) : null,
  };
}

function analyzeDriverIssues(driver: any, summary: any, allPitDurations: number[]) {
  const issues: any[] = [];
  for (const event of summary.race_control_events || []) {
    if (messageLooksLikeIssue(event.message)) {
      issues.push(buildIssue(driver, { type: /penalty/i.test(event.message) ? "penalty" : "race_control", severity: /penalty|collision|unsafe/i.test(event.message) ? "high" : "medium", lap_number: event.lap_number ?? null, message: `Race Control отметил событие: ${event.message}`, source: "race_control" }));
    }
  }
  if (driver.dnf) issues.push(buildIssue(driver, { type: "dnf", severity: "high", message: "Пилот не финишировал. Это проблемный момент гонки, но причина должна подтверждаться событиями Race Control.", source: "session_result" }));
  if (driver.dns) issues.push(buildIssue(driver, { type: "dns", severity: "high", message: "Пилот не стартовал в гонке.", source: "session_result" }));
  if (driver.dsq) issues.push(buildIssue(driver, { type: "dsq", severity: "high", message: "Пилот был дисквалифицирован.", source: "session_result" }));
  if (typeof summary.position_delta === "number" && summary.position_delta < -4) issues.push(buildIssue(driver, { type: "position_loss", severity: summary.position_delta < -8 ? "high" : "medium", message: `Пилот потерял ${Math.abs(summary.position_delta)} позиций относительно старта. Это не обязательно ошибка, но заметный провал результата.`, source: "calculated" }));

  const avgPit = average(allPitDurations);
  if (avgPit) {
    for (const pit of summary.pit_stops || []) {
      const duration = Number(pit.stop_duration ?? pit.lane_duration);
      if (Number.isFinite(duration) && duration > avgPit * 1.25) issues.push(buildIssue(driver, { type: "slow_pit_stop", severity: duration > avgPit * 1.5 ? "high" : "medium", lap_number: pit.lap_number ?? null, message: `Пит-стоп на круге ${pit.lap_number ?? "—"} был заметно медленнее среднего по гонке.`, source: "calculated" }));
    }
  }
  return issues;
}

function buildRaceSummary(session: any, drivers: any[], data: any) {
  const top3 = drivers.filter((driver) => Number.isFinite(driver.finishing_position)).sort((a, b) => a.finishing_position - b.finishing_position).slice(0, 3);
  const lapTimes = data.laps.filter((lap: any) => lap.lap_duration && lap.lap_duration > 0 && !lap.is_pit_out_lap).map((lap: any) => ({ driver_number: lap.driver_number, lap_number: lap.lap_number, lap_duration: lap.lap_duration }));
  const fastestLap = lapTimes.length ? lapTimes.reduce((best: any, lap: any) => (lap.lap_duration < best.lap_duration ? lap : best), lapTimes[0]) : null;
  const pitDurations = data.pitStops.map((pit: any) => Number(pit.stop_duration ?? pit.lane_duration)).filter(Number.isFinite);
  const slowestPitStop = data.pitStops.filter((pit: any) => Number.isFinite(Number(pit.stop_duration ?? pit.lane_duration))).sort((a: any, b: any) => Number(b.stop_duration ?? b.lane_duration) - Number(a.stop_duration ?? a.lane_duration))[0] || null;
  return { session, winner: top3[0] || null, top3, total_drivers: drivers.length, total_laps_with_times: data.laps.length, dnf_count: drivers.filter((driver) => driver.dnf).length, dns_count: drivers.filter((driver) => driver.dns).length, dsq_count: drivers.filter((driver) => driver.dsq).length, pit_stop_count: data.pitStops.length, average_pit_stop: average(pitDurations), slowest_pit_stop: slowestPitStop, fastest_lap: fastestLap, race_control_event_count: data.events.length, weather_latest: data.weather[data.weather.length - 1] || null };
}

function normalizeLocation(points: any[]) {
  if (!points.length) return [];
  const xs = points.map((point) => Number(point.x)).filter(Number.isFinite);
  const ys = points.map((point) => Number(point.y)).filter(Number.isFinite);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const width = maxX - minX || 1, height = maxY - minY || 1;
  return points.map((point) => ({ date: point.date, driver_number: point.driver_number, x: Number((((Number(point.x) - minX) / width) * 100).toFixed(3)), y: Number((((Number(point.y) - minY) / height) * 100).toFixed(3)), z: point.z ?? null }));
}

async function sessionHasUsableData(sessionKey: number) {
  const [drivers, results, laps] = await Promise.all([
    optionalFetch(`${OPENF1_BASE}/drivers?session_key=${sessionKey}`, [], 5000),
    optionalFetch(`${OPENF1_BASE}/session_result?session_key=${sessionKey}`, [], 5000),
    optionalFetch(`${OPENF1_BASE}/laps?session_key=${sessionKey}`, [], 5000),
  ]);
  return drivers.length > 0 || results.length > 0 || laps.length > 0;
}

export async function getOpenF1Sessions(year: number) {
  const data = await fetchJson(`${OPENF1_BASE}/sessions?year=${year}`);
  if (!Array.isArray(data)) return [];
  const now = Date.now();
  const sessions = data
    .filter((session: any) => session.session_name === "Race")
    .filter((session: any) => safeDate(session.date_start) <= now)
    .map(formatSession)
    .sort((a: any, b: any) => safeDate(b.date_start) - safeDate(a.date_start));

  const checked = await Promise.all(sessions.map(async (session: any) => ({ session, hasData: await sessionHasUsableData(session.session_key) })));
  const usable = checked.filter((item) => item.hasData).map((item) => ({ ...item.session, has_openf1_data: true }));
  return usable.length ? usable : sessions.map((session: any) => ({ ...session, has_openf1_data: false }));
}

export async function getOpenF1SessionData(sessionKey: number) {
  return getOpenF1RaceDashboard(sessionKey);
}

export async function getOpenF1RaceDashboard(sessionKey: number) {
  const sessions = await fetchJson(`${OPENF1_BASE}/sessions?session_key=${sessionKey}`);
  const sessionInfo = Array.isArray(sessions) && sessions.length > 0 ? formatSession(sessions[0]) : null;
  if (!sessionInfo) return null;

  const [rawDrivers, sessionResult, startingGrid, rawLaps, rawPitStops, rawStints, rawPositions, rawIntervals, rawRaceControl, rawWeather, rawOvertakes, rawTeamRadio] = await Promise.all([
    optionalFetch(`${OPENF1_BASE}/drivers?session_key=${sessionKey}`),
    optionalFetch(`${OPENF1_BASE}/session_result?session_key=${sessionKey}`),
    optionalFetch(`${OPENF1_BASE}/starting_grid?session_key=${sessionKey}`),
    optionalFetch(`${OPENF1_BASE}/laps?session_key=${sessionKey}`, [], 16_000),
    optionalFetch(`${OPENF1_BASE}/pit?session_key=${sessionKey}`),
    optionalFetch(`${OPENF1_BASE}/stints?session_key=${sessionKey}`),
    optionalFetch(`${OPENF1_BASE}/position?session_key=${sessionKey}`, [], 16_000),
    optionalFetch(`${OPENF1_BASE}/intervals?session_key=${sessionKey}`, [], 10_000),
    optionalFetch(`${OPENF1_BASE}/race_control?session_key=${sessionKey}`),
    optionalFetch(`${OPENF1_BASE}/weather?session_key=${sessionKey}`),
    optionalFetch(`${OPENF1_BASE}/overtakes?session_key=${sessionKey}`),
    optionalFetch(`${OPENF1_BASE}/team_radio?session_key=${sessionKey}`),
  ]);

  const laps = rawLaps.map(formatLap).filter((lap: any) => Number.isFinite(Number(lap.driver_number)) && Number.isFinite(Number(lap.lap_number)));
  const pitStops = rawPitStops.map(formatPit);
  const stints = rawStints.map(formatStint);
  const positions = compact(rawPositions, 2500);
  const intervals = compact(rawIntervals, 1000);
  const events = rawRaceControl.map(formatEvent).sort((a: any, b: any) => safeDate(b.date) - safeDate(a.date));
  const weather = compact(rawWeather, 60);
  const overtakes = compact(rawOvertakes, 500);
  const teamRadio = compact(rawTeamRadio, 80);

  const resultByDriver = new Map(sessionResult.map((item: any) => [item.driver_number, item]));
  const gridByDriver = new Map(startingGrid.map((item: any) => [item.driver_number, item]));
  const driverNumbers = collectDriverNumbers(rawDrivers, sessionResult, startingGrid, laps, pitStops, stints, positions, intervals, events, overtakes);
  const baseDrivers = rawDrivers.length ? rawDrivers : driverNumbers.map((driverNumber) => ({ driver_number: driverNumber, full_name: `Пилот #${driverNumber}` }));
  const drivers = baseDrivers
    .map((driver: any) => formatDriver(driver, resultByDriver.get(driver.driver_number), gridByDriver.get(driver.driver_number)))
    .filter((driver: any, index: number, self: any[]) => index === self.findIndex((item) => item.driver_number === driver.driver_number))
    .sort((a: any, b: any) => {
      const posA = a.finishing_position || Number.MAX_SAFE_INTEGER;
      const posB = b.finishing_position || Number.MAX_SAFE_INTEGER;
      return posA - posB || a.driver_number - b.driver_number;
    });

  const allPitDurations = pitStops.map((pit: any) => Number(pit.stop_duration ?? pit.lane_duration)).filter(Number.isFinite);
  const driverSummaries = drivers.map((driver: any) => buildDriverSummary(driver, { laps, pitStops, stints, positions, events }));
  const issues = driverSummaries.flatMap((summary: any) => analyzeDriverIssues(summary, summary, allPitDurations));

  const mapDriver = drivers.find((driver: any) => driver.finishing_position === 1) || drivers[0];
  const rawLocation = mapDriver ? await optionalFetch(`${OPENF1_BASE}/location?session_key=${sessionKey}&driver_number=${mapDriver.driver_number}`, [], 12_000) : [];
  const sampledLocation = compact(rawLocation, 1200);
  const trackMap = { source_driver_number: mapDriver?.driver_number ?? null, source_driver_name: mapDriver?.full_name ?? null, points: normalizeLocation(sampledLocation), note: sampledLocation.length ? "Карта построена по x/y координатам OpenF1 одного пилота и подходит для схемы трассы/replay." : "OpenF1 не вернул location-точки для карты этой сессии." };
  const raceSummary = buildRaceSummary(sessionInfo, drivers, { laps, pitStops, events, weather });

  return {
    session: sessionInfo,
    summary: raceSummary,
    drivers,
    driver_summaries: driverSummaries,
    race_result: sessionResult,
    starting_grid: startingGrid,
    laps: compact(laps, 2200),
    pit_stops: pitStops,
    stints,
    positions,
    intervals,
    events,
    race_control: events,
    weather,
    overtakes,
    team_radio: teamRadio,
    track_map: trackMap,
    issues,
    data_quality: {
      source: "OpenF1 API",
      has_drivers: drivers.length > 0,
      has_named_drivers: rawDrivers.length > 0,
      has_session_result: sessionResult.length > 0,
      has_laps: laps.length > 0,
      has_pit_stops: pitStops.length > 0,
      has_stints: stints.length > 0,
      has_positions: rawPositions.length > 0,
      has_intervals: rawIntervals.length > 0,
      has_location: sampledLocation.length > 0,
      has_overtakes: rawOvertakes.length > 0,
      has_team_radio: rawTeamRadio.length > 0,
      no_mock_data: true,
      note: drivers.length ? "Данные найдены." : "OpenF1 вернул сессию, но не вернул пилотов/круги/результаты. Выберите другую гонку.",
    },
  };
}

export async function getOpenF1DriverLaps(sessionKey: number, driverNumber: number) {
  const data = await fetchJson(`${OPENF1_BASE}/laps?session_key=${sessionKey}&driver_number=${driverNumber}`);
  if (!Array.isArray(data)) return [];
  return data.map(formatLap).filter((lap: any) => lap.lap_duration && lap.lap_duration > 0);
}

export async function getJolpicaStandings(year: number) {
  const [driversData, constructorsData] = await Promise.all([fetchJson(`${JOLPICA_BASE}/${year}/driverStandings.json`).catch(() => null), fetchJson(`${JOLPICA_BASE}/${year}/constructorStandings.json`).catch(() => null)]);
  const driverList = driversData?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings || [];
  const constructorList = constructorsData?.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings || [];
  return {
    drivers: driverList.map((item: any) => ({ position: Number(item.position), points: Number(item.points), wins: Number(item.wins), driverName: `${item.Driver.givenName} ${item.Driver.familyName}`, driverAcronym: item.Driver.code || item.Driver.familyName.substring(0, 3).toUpperCase(), nationality: item.Driver.nationality, teamName: item.Constructors?.[0]?.name || "—" })),
    constructors: constructorList.map((item: any) => ({ position: Number(item.position), points: Number(item.points), wins: Number(item.wins), teamName: item.Constructor.name, nationality: item.Constructor.nationality })),
  };
}

export async function getJolpicaRaceResults(year: number) {
  const data = await fetchJson(`${JOLPICA_BASE}/${year}/results/1.json`);
  const races = data?.MRData?.RaceTable?.Races || [];
  return races.map((race: any) => {
    const winnerResult = race.Results?.[0];
    const winner = winnerResult ? `${winnerResult.Driver.givenName} ${winnerResult.Driver.familyName}` : "Победитель пока не указан";
    const winnerTeam = winnerResult?.Constructor?.name || "—";
    const winnerAcronym = winnerResult?.Driver?.code || winner.split(" ").map((part: string) => part[0]).join("").slice(0, 3).toUpperCase();
    return { round: Number(race.round), raceName: race.raceName, circuitName: race.Circuit?.circuitName || "—", locality: race.Circuit?.Location?.locality || "—", country: race.Circuit?.Location?.country || "—", date: race.date, winner, winnerAcronym, winnerTeam, time: winnerResult?.Time?.time || "Finished", simpleSummary: `Гонку выиграл ${winner}. Команда: ${winnerTeam}. Этап: ${race.raceName}.` };
  });
}
