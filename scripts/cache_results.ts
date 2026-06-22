import fs from "node:fs/promises";
import path from "node:path";

const OPENF1_BASE = "https://api.openf1.org/v1";
const JOLPICA_BASE = "https://api.jolpi.ca/ergast/f1";
const CACHE_ROOT = path.join(process.cwd(), "data", "openf1-cache");

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

async function fetchJson(url: string, attempts = 3) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25_000);
      const response = await fetch(url, { signal: controller.signal });
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

function isRunningStatus(status: string) {
  return /finished|\+\d|\+\d+\s*lap/i.test(status || "");
}

function driverFromResult(result: any) {
  const driverName = `${result.Driver?.givenName || ""} ${result.Driver?.familyName || ""}`.trim() || `Пилот ${result.number || result.position}`;
  const status = result.status || result.Time?.time || "—";
  return {
    driver_number: Number(result.number || result.Driver?.permanentNumber || result.position),
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
    gap_to_leader: result.position === "1" ? result.Time?.time || "Победитель" : status,
    duration: result.Time?.time || status,
    finish_time: result.Time?.time || status,
    status,
    best_lap_text: result.FastestLap?.Time?.time || null,
    fastest_lap_rank: result.FastestLap?.rank ? Number(result.FastestLap.rank) : null,
    fastest_lap_lap: result.FastestLap?.lap ? Number(result.FastestLap.lap) : null,
    fastest_lap_average_speed: result.FastestLap?.AverageSpeed?.speed || null,
    dnf: !isRunningStatus(status),
    dns: false,
    dsq: /disqualified/i.test(status),
  };
}

function mergeDriver(existing: any, incoming: any) {
  return {
    ...incoming,
    ...Object.fromEntries(Object.entries(existing || {}).filter(([, value]) => value !== null && value !== undefined && value !== "")),
    finishing_position: incoming.finishing_position ?? existing?.finishing_position ?? null,
    starting_position: incoming.starting_position ?? existing?.starting_position ?? null,
    classified_laps: incoming.classified_laps ?? existing?.classified_laps ?? null,
    finish_time: incoming.finish_time ?? existing?.finish_time ?? null,
    gap_to_leader: incoming.gap_to_leader ?? existing?.gap_to_leader ?? null,
    status: incoming.status ?? existing?.status ?? null,
    best_lap_text: incoming.best_lap_text ?? existing?.best_lap_text ?? null,
    fastest_lap_rank: incoming.fastest_lap_rank ?? existing?.fastest_lap_rank ?? null,
    fastest_lap_lap: incoming.fastest_lap_lap ?? existing?.fastest_lap_lap ?? null,
  };
}

function mergeDashboards(existing: any, session: any, race: any, jolpicaDrivers: any[]) {
  const existingDrivers = new Map((existing?.drivers || []).map((driver: any) => [Number(driver.driver_number), driver]));
  const drivers = jolpicaDrivers
    .map((driver) => mergeDriver(existingDrivers.get(Number(driver.driver_number)), driver))
    .sort((a, b) => (Number(a.finishing_position) || 999) - (Number(b.finishing_position) || 999));
  const driverSummaries = drivers.map((driver) => {
    const old = (existing?.driver_summaries || []).find((item: any) => Number(item.driver_number) === Number(driver.driver_number)) || {};
    return { ...old, ...driver, pit_stops: old.pit_stops || [], stints: old.stints || [], race_control_events: old.race_control_events || [], positions: old.positions || [] };
  });
  const top3 = drivers.filter((driver) => Number.isFinite(Number(driver.finishing_position))).slice(0, 3);

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
      dnf_count: drivers.filter((driver) => driver.dnf).length,
      dns_count: drivers.filter((driver) => driver.dns).length,
      dsq_count: drivers.filter((driver) => driver.dsq).length,
      pit_stop_count: existing?.pit_stops?.length || 0,
      fastest_lap: drivers.find((driver) => Number(driver.fastest_lap_rank) === 1) || drivers.find((driver) => driver.best_lap_text) || null,
    },
    drivers,
    driver_summaries: driverSummaries,
    race_result: drivers,
    laps: existing?.laps || [],
    pit_stops: existing?.pit_stops || [],
    stints: existing?.stints || [],
    positions: existing?.positions || [],
    intervals: existing?.intervals || [],
    events: existing?.events || [],
    race_control: existing?.race_control || [],
    weather: existing?.weather || [],
    overtakes: existing?.overtakes || [],
    team_radio: existing?.team_radio || [],
    track_map: existing?.track_map || { points: [], note: "Карта не загружена." },
    issues: existing?.issues || [],
    data_quality: {
      ...(existing?.data_quality || {}),
      source: existing?.data_quality?.source ? `${existing.data_quality.source} + Jolpica results` : "Jolpica historical results",
      has_drivers: drivers.length > 0,
      has_named_drivers: true,
      has_session_result: drivers.some((driver) => Number.isFinite(Number(driver.finishing_position))),
      has_finish_times: drivers.some((driver) => driver.finish_time),
      has_fastest_laps: drivers.some((driver) => driver.best_lap_text),
      has_laps: Boolean(existing?.laps?.some?.((lap: any) => lap.lap_duration)),
      has_pit_stops: Boolean(existing?.pit_stops?.length),
      has_stints: Boolean(existing?.stints?.length),
      has_location: Boolean(existing?.track_map?.points?.length),
      no_mock_data: true,
      cached_historical_data: true,
      enriched_with_jolpica: true,
      note: "Итог гонки, стартовые позиции, финиш, круги финиша и лучшие круги дополнены напрямую из Jolpica. Круги/питы/шины/карта догружаются отдельными источниками.",
    },
  };
}

async function main() {
  const year = Number(process.argv[2] || new Date().getFullYear());
  console.log(`Caching race results for ${year} from Jolpica and mapping them to OpenF1 session_key...`);

  const [openF1SessionsRaw, jolpicaRaw] = await Promise.all([
    fetchJson(`${OPENF1_BASE}/sessions?year=${year}`),
    fetchJson(`${JOLPICA_BASE}/${year}/results.json?limit=2000`),
  ]);

  const openF1Sessions = (Array.isArray(openF1SessionsRaw) ? openF1SessionsRaw : []).filter((session: any) => session.session_name === "Race");
  const races = jolpicaRaw?.MRData?.RaceTable?.Races || [];

  console.log(`OpenF1 races: ${openF1Sessions.length}. Jolpica races with results: ${races.length}.`);

  for (const race of races) {
    const session = matchRace(openF1Sessions, race);
    if (!session) {
      console.log(`  skipped: no OpenF1 session match for ${race.raceName}`);
      continue;
    }
    const sessionKey = Number(session.session_key);
    const existing = await readExisting(sessionKey);
    const jolpicaDrivers = (race.Results || []).map(driverFromResult).filter((driver: any) => Number.isFinite(Number(driver.driver_number)));
    const dashboard = mergeDashboards(existing, session, race, jolpicaDrivers);
    await writeDashboard(sessionKey, dashboard);
    console.log(`  saved ${race.raceName} -> ${sessionKey}: ${jolpicaDrivers.length} classified rows`);
    await sleep(600);
  }

  console.log("Done. Run npm run cache:repair:<year> and restart dev server.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
