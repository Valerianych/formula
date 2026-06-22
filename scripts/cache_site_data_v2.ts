import fs from "node:fs/promises";
import path from "node:path";

const OPENF1_BASE = "https://api.openf1.org/v1";
const JOLPICA_BASE = "https://api.jolpi.ca/ergast/f1";
const CACHE_ROOT = path.join(process.cwd(), "data", "openf1-cache");

type DriverRow = Record<string, any>;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeText(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .replace(/grand prix|race|gp/g, "")
    .replace(/[^a-zа-я0-9]/gi, "")
    .trim();
}

function cacheFile(sessionKey: number) {
  return path.join(CACHE_ROOT, "race-dashboard", `${sessionKey}.json`);
}

async function readExisting(sessionKey: number) {
  try {
    const raw = await fs.readFile(cacheFile(sessionKey), "utf8");
    const payload = JSON.parse(raw);
    return payload?.data ?? payload;
  } catch {
    return null;
  }
}

async function writeDashboard(sessionKey: number, data: any) {
  await fs.mkdir(path.dirname(cacheFile(sessionKey)), { recursive: true });
  await fs.writeFile(cacheFile(sessionKey), JSON.stringify({ savedAt: new Date().toISOString(), url: null, data }, null, 2), "utf8");
}

async function fetchJson(url: string, attempts = 4) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45_000);
      const response = await fetch(url, { signal: controller.signal, cache: "no-store" as any });
      clearTimeout(timeout);
      if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
      return await response.json();
    } catch (error: any) {
      lastError = error;
      console.log(`  retry ${attempt}/${attempts}: ${error?.message || error}`);
      await sleep(2500 * attempt);
    }
  }
  throw lastError;
}

async function optionalJson(url: string) {
  try {
    return await fetchJson(url);
  } catch (error: any) {
    console.log(`  optional failed: ${url} -> ${error?.message || error}`);
    return null;
  }
}

async function fetchPagedRaceData(urlBase: string, arrayName: "Laps" | "PitStops", pageLimit = 100) {
  const collected: any[] = [];
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;
  let page = 0;

  while (offset < total && page < 80) {
    const separator = urlBase.includes("?") ? "&" : "?";
    const url = `${urlBase}${separator}limit=${pageLimit}&offset=${offset}`;
    const payload = await optionalJson(url);
    const mrData = payload?.MRData;
    const race = mrData?.RaceTable?.Races?.[0];
    const items = race?.[arrayName] || [];

    if (!mrData || !items.length) break;
    collected.push(...items);

    total = Number(mrData.total || collected.length);
    const returnedLimit = Number(mrData.limit || pageLimit) || pageLimit;
    const returnedOffset = Number(mrData.offset || offset) || offset;
    offset = returnedOffset + returnedLimit;
    page += 1;
    await sleep(450);
  }

  return collected;
}

function matchRace(openF1Sessions: any[], race: any) {
  const raceText = normalizeText(`${race.raceName} ${race.Circuit?.Location?.locality} ${race.Circuit?.Location?.country}`);
  const raceLocality = normalizeText(race.Circuit?.Location?.locality);
  const raceCountry = normalizeText(race.Circuit?.Location?.country);
  const raceName = normalizeText(race.raceName);

  let best: any = null;
  let bestScore = 0;
  for (const session of openF1Sessions) {
    const sessionText = normalizeText(`${session.meeting_name} ${session.location} ${session.country_name}`);
    let score = 0;
    if (raceLocality && sessionText.includes(raceLocality)) score += 5;
    if (raceCountry && sessionText.includes(raceCountry)) score += 2;
    if (raceName && (sessionText.includes(raceName) || raceText.includes(normalizeText(session.location)))) score += 3;
    if (score > bestScore) {
      best = session;
      bestScore = score;
    }
  }
  return bestScore > 0 ? best : null;
}

function parseDuration(value: unknown) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text || text === "—" || /^finished$/i.test(text)) return null;
  const clean = text.startsWith("+") ? text.slice(1) : text;
  const parts = clean.split(":").map(Number);
  if (parts.some((part) => !Number.isFinite(part))) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0];
  return null;
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds)) return "—";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = (seconds % 60).toFixed(3).padStart(6, "0");
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${rest}`;
  return `${minutes}:${rest}`;
}

function formatGap(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "—";
  if (seconds >= 60) return `+${formatDuration(seconds)}`;
  return `+${seconds.toFixed(3)}`;
}

function parseLapTime(value: string | null | undefined) {
  return parseDuration(value);
}

function isRunningStatus(status: string) {
  return /finished|\+\d|\+\d+\s*lap/i.test(status || "");
}

function driverFromResult(result: any): DriverRow {
  const driverName = `${result.Driver?.givenName || ""} ${result.Driver?.familyName || ""}`.trim() || `Пилот ${result.number || result.position}`;
  const rawStatus = result.status || "Финишировал";
  const rawTime = result.Time?.time || rawStatus;
  return {
    driver_number: Number(result.number || result.Driver?.permanentNumber || result.position),
    driver_id: result.Driver?.driverId || null,
    broadcast_name: result.Driver?.code || driverName,
    full_name: driverName,
    first_name: result.Driver?.givenName || null,
    last_name: result.Driver?.familyName || null,
    name_acronym: result.Driver?.code || driverName.slice(0, 3).toUpperCase(),
    team_name: result.Constructor?.name || "Команда не указана",
    team_colour: "666666",
    headshot_url: "https://media.formula1.com/d_driver_fallback_image.png",
    starting_position: Number(result.grid) > 0 ? Number(result.grid) : null,
    finishing_position: Number(result.position) || null,
    classified_laps: Number(result.laps) || null,
    raw_finish_time: rawTime,
    gap_to_leader: rawTime,
    duration: rawTime,
    finish_time: rawTime,
    status: isRunningStatus(rawStatus) ? "Финишировал" : rawStatus,
    best_lap_text: result.FastestLap?.Time?.time || null,
    fastest_lap_rank: result.FastestLap?.rank ? Number(result.FastestLap.rank) : null,
    fastest_lap_lap: result.FastestLap?.lap ? Number(result.FastestLap.lap) : null,
    fastest_lap_average_speed: result.FastestLap?.AverageSpeed?.speed || null,
    dnf: !isRunningStatus(rawStatus),
    dns: false,
    dsq: /disqualified/i.test(rawStatus),
  };
}

function normalizeFinishTimes(drivers: DriverRow[]) {
  const winner = drivers.find((driver) => Number(driver.finishing_position) === 1) || drivers[0];
  const winnerSeconds = parseDuration(winner?.raw_finish_time ?? winner?.finish_time);

  return drivers.map((driver) => {
    const place = Number(driver.finishing_position);
    const seconds = parseDuration(driver.raw_finish_time ?? driver.finish_time);
    if (seconds !== null) {
      if (winnerSeconds !== null && place > 1 && seconds > winnerSeconds + 1) {
        driver.finish_time = formatGap(seconds - winnerSeconds);
        driver.gap_to_leader = driver.finish_time;
      } else if (place > 1 && String(driver.raw_finish_time || "").startsWith("+")) {
        driver.finish_time = String(driver.raw_finish_time);
        driver.gap_to_leader = driver.finish_time;
      } else if (place > 1 && seconds < 600) {
        driver.finish_time = formatGap(seconds);
        driver.gap_to_leader = driver.finish_time;
      } else {
        driver.finish_time = formatDuration(seconds);
        driver.gap_to_leader = driver.finish_time;
      }
      driver.duration = driver.finish_time;
    }
    if (!driver.status || /^\+?\d/.test(String(driver.status))) driver.status = driver.dnf ? "DNF" : "Финишировал";
    return driver;
  });
}

function qualifyingGrid(qualifyingRace: any) {
  const map = new Map<string, number>();
  const results = qualifyingRace?.QualifyingResults || [];
  for (const item of results) {
    if (item.Driver?.driverId && Number(item.position)) map.set(item.Driver.driverId, Number(item.position));
  }
  return map;
}

function buildLaps(lapPages: any[], driverIdToNumber: Map<string, number>) {
  const laps: any[] = [];
  const positions: any[] = [];
  for (const lap of lapPages || []) {
    const lapNumber = Number(lap.number);
    for (const timing of lap.Timings || []) {
      const driverNumber = driverIdToNumber.get(timing.driverId);
      if (!driverNumber) continue;
      const lapDuration = parseLapTime(timing.time);
      laps.push({
        driver_number: driverNumber,
        lap_number: lapNumber,
        lap_duration: lapDuration,
        duration_sector_1: null,
        duration_sector_2: null,
        duration_sector_3: null,
        i1_speed: null,
        i2_speed: null,
        st_speed: null,
        is_pit_out_lap: false,
        position: Number(timing.position) || null,
        date_start: null,
        source: "Jolpica lap timings",
      });
      positions.push({ driver_number: driverNumber, lap_number: lapNumber, position: Number(timing.position) || null, date: `lap-${lapNumber}` });
    }
  }
  return { laps, positions };
}

function buildPitStops(pitPages: any[], driverIdToNumber: Map<string, number>) {
  const pitStops: any[] = [];
  for (const stop of pitPages || []) {
    const driverNumber = driverIdToNumber.get(stop.driverId);
    if (!driverNumber) continue;
    pitStops.push({
      driver_number: driverNumber,
      lap_number: Number(stop.lap) || null,
      date: stop.time || null,
      lane_duration: null,
      stop_duration: stop.duration ? Number(stop.duration) : null,
      stop_number: Number(stop.stop) || null,
      source: "Jolpica pitstops",
    });
  }
  return pitStops;
}

function buildDriverSummaries(drivers: any[], laps: any[], pitStops: any[], positions: any[]) {
  return drivers.map((driver) => {
    const driverLaps = laps.filter((lap) => lap.driver_number === driver.driver_number && lap.lap_duration);
    const lapTimes = driverLaps.map((lap) => Number(lap.lap_duration)).filter(Number.isFinite);
    const bestLap = lapTimes.length ? Math.min(...lapTimes) : null;
    const averageLap = lapTimes.length ? lapTimes.reduce((sum, value) => sum + value, 0) / lapTimes.length : null;
    const sorted = [...lapTimes].sort((a, b) => a - b);
    const medianLap = sorted.length ? sorted[Math.floor(sorted.length / 2)] : null;
    const driverPitStops = pitStops.filter((pit) => pit.driver_number === driver.driver_number);
    const driverPositions = positions.filter((position) => position.driver_number === driver.driver_number);
    const bestLapText = driver.best_lap_text || (bestLap ? formatDuration(bestLap) : null);

    return {
      ...driver,
      laps_count: driverLaps.length,
      best_lap: bestLap,
      best_lap_text: bestLapText,
      average_lap: averageLap,
      median_lap: medianLap,
      pit_stop_count: driverPitStops.length,
      average_pit_stop: null,
      fastest_pit_stop: null,
      pit_stops: driverPitStops,
      stints: [],
      race_control_events: [],
      positions: driverPositions,
      position_delta: Number.isFinite(driver.starting_position) && Number.isFinite(driver.finishing_position) ? Number(driver.starting_position) - Number(driver.finishing_position) : null,
    };
  });
}

function mergeDashboard(existing: any, session: any, race: any, drivers: any[], laps: any[], positions: any[], pitStops: any[]) {
  const existingTrackMap = existing?.track_map || { points: [], note: "Карта не загружена: Jolpica не отдаёт x/y координаты трассы." };
  const existingEvents = existing?.events || [];
  const existingWeather = existing?.weather || [];
  const driverSummaries = buildDriverSummaries(drivers, laps, pitStops, positions);
  const top3 = drivers.filter((driver) => Number.isFinite(Number(driver.finishing_position))).sort((a, b) => a.finishing_position - b.finishing_position).slice(0, 3);
  const fastestLap = driverSummaries.filter((driver) => driver.best_lap || driver.best_lap_text).sort((a, b) => (a.best_lap || 9999) - (b.best_lap || 9999))[0] || null;

  return {
    ...(existing || {}),
    session: {
      ...(existing?.session || {}),
      session_key: Number(session.session_key),
      session_name: "Race",
      meeting_name: session.meeting_name || race.raceName,
      location: session.location || race.Circuit?.Location?.locality || "—",
      country_name: session.country_name || race.Circuit?.Location?.country || "—",
      year: Number(session.year),
      date_start: session.date_start || race.date,
    },
    summary: {
      ...(existing?.summary || {}),
      winner: top3[0] || null,
      top3,
      total_drivers: drivers.length,
      total_laps_with_times: laps.filter((lap) => lap.lap_duration).length,
      dnf_count: drivers.filter((driver) => driver.dnf).length,
      dns_count: drivers.filter((driver) => driver.dns).length,
      dsq_count: drivers.filter((driver) => driver.dsq).length,
      pit_stop_count: pitStops.length,
      average_pit_stop: null,
      slowest_pit_stop: pitStops.filter((pit) => Number.isFinite(pit.stop_duration)).sort((a, b) => Number(b.stop_duration) - Number(a.stop_duration))[0] || null,
      fastest_lap: fastestLap,
      race_control_event_count: existingEvents.length,
      weather_latest: existingWeather[existingWeather.length - 1] || null,
    },
    drivers,
    driver_summaries: driverSummaries,
    race_result: drivers,
    starting_grid: drivers.map((driver) => ({ driver_number: driver.driver_number, position: driver.starting_position })).filter((item) => item.position),
    laps,
    pit_stops: pitStops,
    stints: existing?.stints || [],
    positions,
    intervals: existing?.intervals || [],
    events: existingEvents,
    race_control: existing?.race_control || existingEvents,
    weather: existingWeather,
    overtakes: existing?.overtakes || [],
    team_radio: existing?.team_radio || [],
    track_map: existingTrackMap,
    issues: existing?.issues || [],
    data_quality: {
      ...(existing?.data_quality || {}),
      source: "OpenF1 session index + Jolpica paginated API",
      has_drivers: drivers.length > 0,
      has_named_drivers: drivers.length > 0,
      has_session_result: drivers.some((driver) => Number.isFinite(Number(driver.finishing_position))),
      has_laps: laps.length > 0,
      has_pit_stops: pitStops.length > 0,
      has_stints: Boolean(existing?.stints?.length),
      has_positions: positions.length > 0,
      has_intervals: Boolean(existing?.intervals?.length),
      has_location: Boolean(existingTrackMap?.points?.length),
      has_overtakes: Boolean(existing?.overtakes?.length),
      has_team_radio: Boolean(existing?.team_radio?.length),
      has_finish_times: drivers.some((driver) => driver.finish_time),
      has_fastest_laps: driverSummaries.some((driver) => driver.best_lap || driver.best_lap_text),
      no_mock_data: true,
      cached_historical_data: true,
      enriched_with_jolpica: true,
      note: `Загружено через API: результат, старт, финиш, круги (${laps.length}), позиции по кругам (${positions.length}), пит-стопы (${pitStops.length}). Карта/радио/интервалы зависят от отдельных источников.`,
    },
  };
}

async function main() {
  const year = Number(process.argv[2] || new Date().getFullYear());
  console.log(`Caching complete site data for ${year} from OpenF1 + Jolpica paginated API...`);

  const openF1SessionsRaw = await fetchJson(`${OPENF1_BASE}/sessions?year=${year}`);
  const openF1Sessions = (Array.isArray(openF1SessionsRaw) ? openF1SessionsRaw : []).filter((session: any) => session.session_name === "Race");
  const resultsRaw = await fetchJson(`${JOLPICA_BASE}/${year}/results.json?limit=2000`);
  const races = resultsRaw?.MRData?.RaceTable?.Races || [];
  console.log(`OpenF1 races: ${openF1Sessions.length}. Jolpica result races: ${races.length}.`);

  for (const race of races) {
    const session = matchRace(openF1Sessions, race);
    if (!session) {
      console.log(`  skipped: no OpenF1 session match for ${race.raceName}`);
      continue;
    }

    const round = Number(race.round);
    const sessionKey = Number(session.session_key);
    console.log(`\n[round ${round}] ${race.raceName} -> OpenF1 session ${sessionKey}`);

    const existing = await readExisting(sessionKey);
    let drivers = (race.Results || []).map(driverFromResult).filter((driver: any) => Number.isFinite(Number(driver.driver_number)));
    const driverIdToNumber = new Map(drivers.map((driver: any) => [driver.driver_id, Number(driver.driver_number)]));

    const qualifyingRaw = await optionalJson(`${JOLPICA_BASE}/${year}/${round}/qualifying.json?limit=200`);
    const qualifyingRace = qualifyingRaw?.MRData?.RaceTable?.Races?.[0];
    const grid = qualifyingGrid(qualifyingRace);
    for (const driver of drivers) {
      if (!driver.starting_position && driver.driver_id && grid.has(driver.driver_id)) driver.starting_position = grid.get(driver.driver_id) || null;
    }
    drivers = normalizeFinishTimes(drivers);

    const [lapPages, pitPages] = await Promise.all([
      fetchPagedRaceData(`${JOLPICA_BASE}/${year}/${round}/laps.json`, "Laps", 100),
      fetchPagedRaceData(`${JOLPICA_BASE}/${year}/${round}/pitstops.json`, "PitStops", 100),
    ]);

    const { laps, positions } = buildLaps(lapPages, driverIdToNumber);
    const pitStops = buildPitStops(pitPages, driverIdToNumber);

    const dashboard = mergeDashboard(existing, session, race, drivers, laps, positions, pitStops);
    await writeDashboard(sessionKey, dashboard);
    console.log(`  saved: drivers=${drivers.length}, laps=${laps.length}, pit_stops=${pitStops.length}, positions=${positions.length}`);
    await sleep(1200);
  }

  console.log("\nDone. Now run: npm run cache:repair:<year>, then npm run dev");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
