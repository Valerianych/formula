import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { MOCK_SESSIONS, type Driver, type Lap, type WeatherCondition, type RaceEvent } from "../f1_mock.js";

type SqliteDatabase = Database.Database;

export type SessionRow = {
  session_key: number;
  session_name: string;
  session_type: string;
  meeting_key: number;
  meeting_name: string;
  location: string;
  country_name: string;
  year: number;
  date_start: string;
};

const YEARS_TO_PRELOAD = [2024, 2025, 2026];
const DEFAULT_DB_PATH = path.join(process.cwd(), "data", "f1.sqlite");
let db: SqliteDatabase | null = null;

const sessionTemplates = [
  { name: "Bahrain Grand Prix", location: "Sakhir", country: "Bahrain", month: 3, day: 2, keyOffset: 1 },
  { name: "Saudi Arabian Grand Prix", location: "Jeddah", country: "Saudi Arabia", month: 3, day: 9, keyOffset: 2 },
  { name: "Australian Grand Prix", location: "Melbourne", country: "Australia", month: 3, day: 24, keyOffset: 3 },
  { name: "Japanese Grand Prix", location: "Suzuka", country: "Japan", month: 4, day: 7, keyOffset: 4 },
  { name: "Chinese Grand Prix", location: "Shanghai", country: "China", month: 4, day: 21, keyOffset: 5 },
  { name: "Miami Grand Prix", location: "Miami", country: "USA", month: 5, day: 5, keyOffset: 6 },
  { name: "Emilia Romagna Grand Prix", location: "Imola", country: "Italy", month: 5, day: 19, keyOffset: 7 },
  { name: "Monaco Grand Prix", location: "Monte Carlo", country: "Monaco", month: 5, day: 26, keyOffset: 8 },
  { name: "Canadian Grand Prix", location: "Montreal", country: "Canada", month: 6, day: 9, keyOffset: 9 },
  { name: "Spanish Grand Prix", location: "Barcelona", country: "Spain", month: 6, day: 23, keyOffset: 10 },
  { name: "Austrian Grand Prix", location: "Spielberg", country: "Austria", month: 6, day: 30, keyOffset: 11 },
  { name: "British Grand Prix", location: "Silverstone", country: "Great Britain", month: 7, day: 7, keyOffset: 12 },
  { name: "Hungarian Grand Prix", location: "Budapest", country: "Hungary", month: 7, day: 21, keyOffset: 13 },
  { name: "Belgian Grand Prix", location: "Spa", country: "Belgium", month: 7, day: 28, keyOffset: 14 },
  { name: "Dutch Grand Prix", location: "Zandvoort", country: "Netherlands", month: 8, day: 25, keyOffset: 15 },
  { name: "Italian Grand Prix", location: "Monza", country: "Italy", month: 9, day: 1, keyOffset: 16 },
  { name: "Azerbaijan Grand Prix", location: "Baku", country: "Azerbaijan", month: 9, day: 15, keyOffset: 17 },
  { name: "Singapore Grand Prix", location: "Singapore", country: "Singapore", month: 9, day: 22, keyOffset: 18 },
  { name: "United States Grand Prix", location: "Austin", country: "USA", month: 10, day: 20, keyOffset: 19 },
  { name: "Mexico City Grand Prix", location: "Mexico City", country: "Mexico", month: 10, day: 27, keyOffset: 20 },
  { name: "São Paulo Grand Prix", location: "São Paulo", country: "Brazil", month: 11, day: 3, keyOffset: 21 },
  { name: "Las Vegas Grand Prix", location: "Las Vegas", country: "USA", month: 11, day: 23, keyOffset: 22 },
  { name: "Qatar Grand Prix", location: "Lusail", country: "Qatar", month: 12, day: 1, keyOffset: 23 },
  { name: "Abu Dhabi Grand Prix", location: "Yas Marina", country: "UAE", month: 12, day: 8, keyOffset: 24 },
];

const baseRaceResults = [
  [1, "Bahrain Grand Prix", "Bahrain International Circuit", "Sakhir", "Bahrain", "03-02", "Max Verstappen", "VER", "Red Bull", "1:31:44.742"],
  [2, "Saudi Arabian Grand Prix", "Jeddah Street Circuit", "Jeddah", "Saudi Arabia", "03-09", "Max Verstappen", "VER", "Red Bull", "1:20:43.119"],
  [3, "Australian Grand Prix", "Albert Park Circuit", "Melbourne", "Australia", "03-24", "Carlos Sainz", "SAI", "Ferrari", "1:20:26.843"],
  [4, "Japanese Grand Prix", "Suzuka International Racing Course", "Suzuka", "Japan", "04-07", "Max Verstappen", "VER", "Red Bull", "1:54:23.566"],
  [5, "Chinese Grand Prix", "Shanghai International Circuit", "Shanghai", "China", "04-21", "Max Verstappen", "VER", "Red Bull", "1:40:52.554"],
  [6, "Miami Grand Prix", "Miami International Autodrome", "Miami", "USA", "05-05", "Lando Norris", "NOR", "McLaren", "1:30:49.876"],
  [7, "Emilia Romagna Grand Prix", "Autodromo Enzo e Dino Ferrari", "Imola", "Italy", "05-19", "Max Verstappen", "VER", "Red Bull", "1:25:25.252"],
  [8, "Monaco Grand Prix", "Circuit de Monaco", "Monte Carlo", "Monaco", "05-26", "Charles Leclerc", "LEC", "Ferrari", "1:41:22.001"],
  [9, "Canadian Grand Prix", "Circuit Gilles Villeneuve", "Montreal", "Canada", "06-09", "Max Verstappen", "VER", "Red Bull", "1:28:30.410"],
  [10, "Spanish Grand Prix", "Circuit de Barcelona-Catalunya", "Barcelona", "Spain", "06-23", "Max Verstappen", "VER", "Red Bull", "1:29:05.112"],
  [11, "Austrian Grand Prix", "Red Bull Ring", "Spielberg", "Austria", "06-30", "George Russell", "RUS", "Mercedes", "1:24:22.410"],
  [12, "British Grand Prix", "Silverstone Circuit", "Silverstone", "UK", "07-07", "Lewis Hamilton", "HAM", "Mercedes", "1:29:12.441"],
  [13, "Hungarian Grand Prix", "Hungaroring", "Budapest", "Hungary", "07-21", "Oscar Piastri", "PIA", "McLaren", "1:38:01.992"],
  [14, "Belgian Grand Prix", "Circuit de Spa-Francorchamps", "Spa", "Belgium", "07-28", "Lewis Hamilton", "HAM", "Mercedes", "1:19:57.510"],
  [15, "Dutch Grand Prix", "Circuit Zandvoort", "Zandvoort", "Netherlands", "08-25", "Lando Norris", "NOR", "McLaren", "1:30:45.519"],
  [16, "Italian Grand Prix", "Autodromo Nazionale Monza", "Monza", "Italy", "08-31", "Charles Leclerc", "LEC", "Ferrari", "1:14:40.727"],
  [17, "Azerbaijan Grand Prix", "Baku City Circuit", "Baku", "Azerbaijan", "09-15", "Oscar Piastri", "PIA", "McLaren", "1:32:58.007"],
  [18, "Singapore Grand Prix", "Marina Bay Street Circuit", "Singapore", "Singapore", "09-22", "Lando Norris", "NOR", "McLaren", "1:40:50.571"],
  [19, "United States Grand Prix", "Circuit of the Americas", "Austin", "USA", "10-20", "Charles Leclerc", "LEC", "Ferrari", "1:35:09.631"],
  [20, "Mexico City Grand Prix", "Autódromo Hermanos Rodríguez", "Mexico City", "Mexico", "10-27", "Carlos Sainz", "SAI", "Ferrari", "1:40:55.807"],
  [21, "São Paulo Grand Prix", "Autódromo José Carlos Pace", "São Paulo", "Brazil", "11-03", "Max Verstappen", "VER", "Red Bull", "2:06:54.430"],
  [22, "Las Vegas Grand Prix", "Las Vegas Strip Circuit", "Las Vegas", "USA", "11-23", "George Russell", "RUS", "Mercedes", "1:22:05.992"],
  [23, "Qatar Grand Prix", "Lusail International Circuit", "Lusail", "Qatar", "12-01", "Max Verstappen", "VER", "Red Bull", "1:31:05.323"],
  [24, "Abu Dhabi Grand Prix", "Yas Marina Circuit", "Yas Marina", "UAE", "12-08", "Lewis Hamilton", "HAM", "Mercedes", "1:39:45.302"],
] as const;

const driverStandings = [
  { position: 1, points: 437, wins: 9, driverName: "Max Verstappen", driverAcronym: "VER", nationality: "Dutch", teamName: "Red Bull Racing" },
  { position: 2, points: 384, wins: 3, driverName: "Lando Norris", driverAcronym: "NOR", nationality: "British", teamName: "McLaren" },
  { position: 3, points: 325, wins: 2, driverName: "Charles Leclerc", driverAcronym: "LEC", nationality: "Monegasque", teamName: "Ferrari" },
  { position: 4, points: 244, wins: 2, driverName: "Lewis Hamilton", driverAcronym: "HAM", nationality: "British", teamName: "Mercedes" },
  { position: 5, points: 228, wins: 1, driverName: "Oscar Piastri", driverAcronym: "PIA", nationality: "Australian", teamName: "McLaren" },
  { position: 6, points: 190, wins: 1, driverName: "Carlos Sainz", driverAcronym: "SAI", nationality: "Spanish", teamName: "Ferrari" },
];

const constructorStandings = [
  { position: 1, points: 641, wins: 8, teamName: "McLaren", nationality: "British" },
  { position: 2, points: 585, wins: 3, teamName: "Ferrari", nationality: "Italian" },
  { position: 3, points: 544, wins: 9, teamName: "Red Bull Racing", nationality: "Austrian" },
  { position: 4, points: 382, wins: 2, teamName: "Mercedes", nationality: "British" },
];

export function getDbPath() {
  return process.env.F1_DB_PATH || DEFAULT_DB_PATH;
}

export function getDb() {
  if (!db) {
    const dbPath = getDbPath();
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
  }
  return db;
}

export function ensureDatabase() {
  const database = getDb();
  database.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      session_key INTEGER PRIMARY KEY,
      session_name TEXT NOT NULL,
      session_type TEXT NOT NULL,
      meeting_key INTEGER NOT NULL,
      meeting_name TEXT NOT NULL,
      location TEXT NOT NULL,
      country_name TEXT NOT NULL,
      year INTEGER NOT NULL,
      date_start TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS session_drivers (
      session_key INTEGER NOT NULL,
      driver_number INTEGER NOT NULL,
      broadcast_name TEXT,
      full_name TEXT NOT NULL,
      name_acronym TEXT,
      team_name TEXT,
      team_colour TEXT,
      headshot_url TEXT,
      PRIMARY KEY (session_key, driver_number),
      FOREIGN KEY (session_key) REFERENCES sessions(session_key) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS laps (
      session_key INTEGER NOT NULL,
      driver_number INTEGER NOT NULL,
      lap_number INTEGER NOT NULL,
      lap_duration REAL,
      duration_sector_1 REAL,
      duration_sector_2 REAL,
      duration_sector_3 REAL,
      is_pit_out_lap INTEGER DEFAULT 0,
      PRIMARY KEY (session_key, driver_number, lap_number),
      FOREIGN KEY (session_key, driver_number) REFERENCES session_drivers(session_key, driver_number) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS weather (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_key INTEGER NOT NULL,
      date TEXT,
      air_temperature REAL,
      track_temperature REAL,
      humidity REAL,
      rainfall REAL,
      FOREIGN KEY (session_key) REFERENCES sessions(session_key) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS race_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_key INTEGER NOT NULL,
      date TEXT,
      lap_number INTEGER,
      category TEXT,
      message TEXT,
      flag TEXT,
      FOREIGN KEY (session_key) REFERENCES sessions(session_key) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS driver_standings (
      year INTEGER NOT NULL,
      position INTEGER NOT NULL,
      points REAL,
      wins INTEGER,
      driverName TEXT NOT NULL,
      driverAcronym TEXT,
      nationality TEXT,
      teamName TEXT,
      PRIMARY KEY (year, position)
    );

    CREATE TABLE IF NOT EXISTS constructor_standings (
      year INTEGER NOT NULL,
      position INTEGER NOT NULL,
      points REAL,
      wins INTEGER,
      teamName TEXT NOT NULL,
      nationality TEXT,
      PRIMARY KEY (year, position)
    );

    CREATE TABLE IF NOT EXISTS race_results (
      year INTEGER NOT NULL,
      round INTEGER NOT NULL,
      raceName TEXT NOT NULL,
      circuitName TEXT,
      locality TEXT,
      country TEXT,
      date TEXT,
      winner TEXT,
      winnerAcronym TEXT,
      winnerTeam TEXT,
      time TEXT,
      PRIMARY KEY (year, round)
    );
  `);

  const count = database.prepare("SELECT COUNT(*) as count FROM sessions").get() as { count: number };
  if (count.count === 0) {
    seedDatabase();
  }
}

export function resetDatabase() {
  const database = getDb();
  database.exec(`
    DROP TABLE IF EXISTS race_results;
    DROP TABLE IF EXISTS constructor_standings;
    DROP TABLE IF EXISTS driver_standings;
    DROP TABLE IF EXISTS race_events;
    DROP TABLE IF EXISTS weather;
    DROP TABLE IF EXISTS laps;
    DROP TABLE IF EXISTS session_drivers;
    DROP TABLE IF EXISTS sessions;
  `);
  ensureDatabase();
  return getDbPath();
}

function createSessionForYear(year: number, template: (typeof sessionTemplates)[number]): SessionRow {
  const monthStr = String(template.month).padStart(2, "0");
  const dayStr = String(template.day).padStart(2, "0");
  return {
    session_key: year * 1000 + template.keyOffset,
    session_name: "Race",
    session_type: "Race",
    meeting_key: year * 100 + template.keyOffset,
    meeting_name: `${template.name} (${year})`,
    location: template.location,
    country_name: template.country,
    year,
    date_start: `${year}-${monthStr}-${dayStr}T14:00:00Z`,
  };
}

function getBaseMockSession(keyOffset: number) {
  return MOCK_SESSIONS[keyOffset % 2 === 1 ? 9507 : 9541] || MOCK_SESSIONS[9507] || Object.values(MOCK_SESSIONS)[0];
}

function scaledLapsForDriver(baseLaps: Record<number, Lap[]>, driverNumber: number) {
  const firstDriver = Number(Object.keys(baseLaps)[0]);
  const laps = baseLaps[driverNumber] || baseLaps[firstDriver] || [];
  const scale = 1 + (((driverNumber * 17) % 31) - 15) / 500;
  return laps.map((lap) => ({
    ...lap,
    lap_duration: lap.lap_duration ? Number((lap.lap_duration * scale).toFixed(3)) : null,
    duration_sector_1: lap.duration_sector_1 ? Number((lap.duration_sector_1 * scale).toFixed(3)) : null,
    duration_sector_2: lap.duration_sector_2 ? Number((lap.duration_sector_2 * scale).toFixed(3)) : null,
    duration_sector_3: lap.duration_sector_3 ? Number((lap.duration_sector_3 * scale).toFixed(3)) : null,
  }));
}

export function seedYear(year: number) {
  const database = getDb();
  const insertSession = database.prepare(`
    INSERT OR REPLACE INTO sessions
    (session_key, session_name, session_type, meeting_key, meeting_name, location, country_name, year, date_start)
    VALUES (@session_key, @session_name, @session_type, @meeting_key, @meeting_name, @location, @country_name, @year, @date_start)
  `);
  const insertDriver = database.prepare(`
    INSERT OR REPLACE INTO session_drivers
    (session_key, driver_number, broadcast_name, full_name, name_acronym, team_name, team_colour, headshot_url)
    VALUES (@session_key, @driver_number, @broadcast_name, @full_name, @name_acronym, @team_name, @team_colour, @headshot_url)
  `);
  const insertLap = database.prepare(`
    INSERT OR REPLACE INTO laps
    (session_key, driver_number, lap_number, lap_duration, duration_sector_1, duration_sector_2, duration_sector_3, is_pit_out_lap)
    VALUES (@session_key, @driver_number, @lap_number, @lap_duration, @duration_sector_1, @duration_sector_2, @duration_sector_3, @is_pit_out_lap)
  `);
  const insertWeather = database.prepare(`
    INSERT INTO weather (session_key, date, air_temperature, track_temperature, humidity, rainfall)
    VALUES (@session_key, @date, @air_temperature, @track_temperature, @humidity, @rainfall)
  `);
  const insertEvent = database.prepare(`
    INSERT INTO race_events (session_key, date, lap_number, category, message, flag)
    VALUES (@session_key, @date, @lap_number, @category, @message, @flag)
  `);
  const insertRaceResult = database.prepare(`
    INSERT OR REPLACE INTO race_results
    (year, round, raceName, circuitName, locality, country, date, winner, winnerAcronym, winnerTeam, time)
    VALUES (@year, @round, @raceName, @circuitName, @locality, @country, @date, @winner, @winnerAcronym, @winnerTeam, @time)
  `);
  const insertDriverStanding = database.prepare(`
    INSERT OR REPLACE INTO driver_standings
    (year, position, points, wins, driverName, driverAcronym, nationality, teamName)
    VALUES (@year, @position, @points, @wins, @driverName, @driverAcronym, @nationality, @teamName)
  `);
  const insertConstructorStanding = database.prepare(`
    INSERT OR REPLACE INTO constructor_standings
    (year, position, points, wins, teamName, nationality)
    VALUES (@year, @position, @points, @wins, @teamName, @nationality)
  `);

  const insertAll = database.transaction(() => {
    for (const template of sessionTemplates) {
      const session = createSessionForYear(year, template);
      const base = getBaseMockSession(template.keyOffset);
      if (!base) continue;
      insertSession.run(session);
      database.prepare("DELETE FROM weather WHERE session_key = ?").run(session.session_key);
      database.prepare("DELETE FROM race_events WHERE session_key = ?").run(session.session_key);

      for (const driver of base.drivers as Driver[]) {
        insertDriver.run({ session_key: session.session_key, ...driver });
        const laps = scaledLapsForDriver(base.laps, driver.driver_number);
        for (const lap of laps) {
          insertLap.run({
            session_key: session.session_key,
            driver_number: driver.driver_number,
            lap_number: lap.lap_number,
            lap_duration: lap.lap_duration,
            duration_sector_1: lap.duration_sector_1,
            duration_sector_2: lap.duration_sector_2,
            duration_sector_3: lap.duration_sector_3,
            is_pit_out_lap: lap.is_pit_out_lap ? 1 : 0,
          });
        }
      }

      for (const weather of base.weather as WeatherCondition[]) {
        insertWeather.run({ session_key: session.session_key, ...weather });
      }
      for (const event of base.events as RaceEvent[]) {
        insertEvent.run({ session_key: session.session_key, ...event });
      }
    }

    for (const result of baseRaceResults) {
      const [round, raceName, circuitName, locality, country, mmdd, winner, winnerAcronym, winnerTeam, time] = result;
      insertRaceResult.run({ year, round, raceName, circuitName, locality, country, date: `${year}-${mmdd}`, winner, winnerAcronym, winnerTeam, time });
    }

    for (const standing of driverStandings) {
      insertDriverStanding.run({ year, ...standing });
    }
    for (const standing of constructorStandings) {
      insertConstructorStanding.run({ year, ...standing });
    }
  });

  insertAll();
}

export function seedDatabase() {
  for (const year of YEARS_TO_PRELOAD) {
    seedYear(year);
  }
}

export function ensureYearSeeded(year: number) {
  const database = getDb();
  const count = database.prepare("SELECT COUNT(*) as count FROM sessions WHERE year = ?").get(year) as { count: number };
  if (count.count === 0) {
    seedYear(year);
  }
}

export function getSessionsByYear(year: number) {
  ensureYearSeeded(year);
  return getDb()
    .prepare("SELECT * FROM sessions WHERE year = ? ORDER BY datetime(date_start) DESC")
    .all(year) as SessionRow[];
}

export function getSessionData(sessionKey: number) {
  const database = getDb();
  const session = database.prepare("SELECT * FROM sessions WHERE session_key = ?").get(sessionKey) as SessionRow | undefined;
  if (!session) return null;

  const drivers = database.prepare("SELECT driver_number, broadcast_name, full_name, name_acronym, team_name, team_colour, headshot_url FROM session_drivers WHERE session_key = ? ORDER BY driver_number").all(sessionKey);
  const weather = database.prepare("SELECT date, air_temperature, track_temperature, humidity, rainfall FROM weather WHERE session_key = ? ORDER BY id").all(sessionKey);
  const events = database.prepare("SELECT date, lap_number, category, message, flag FROM race_events WHERE session_key = ? ORDER BY id LIMIT 30").all(sessionKey);

  return { session, drivers, weather, events, laps: {} };
}

export function getDriverLaps(sessionKey: number, driverNumber: number) {
  return getDb()
    .prepare("SELECT lap_number, lap_duration, duration_sector_1, duration_sector_2, duration_sector_3, is_pit_out_lap FROM laps WHERE session_key = ? AND driver_number = ? ORDER BY lap_number")
    .all(sessionKey, driverNumber)
    .map((lap: any) => ({ ...lap, is_pit_out_lap: Boolean(lap.is_pit_out_lap) }));
}

export function getStandings(year: number) {
  ensureYearSeeded(year);
  const database = getDb();
  return {
    drivers: database.prepare("SELECT position, points, wins, driverName, driverAcronym, nationality, teamName FROM driver_standings WHERE year = ? ORDER BY position").all(year),
    constructors: database.prepare("SELECT position, points, wins, teamName, nationality FROM constructor_standings WHERE year = ? ORDER BY position").all(year),
  };
}

export function getRaceResults(year: number) {
  ensureYearSeeded(year);
  return getDb()
    .prepare("SELECT round, raceName, circuitName, locality, country, date, winner, winnerAcronym, winnerTeam, time FROM race_results WHERE year = ? ORDER BY round")
    .all(year);
}

export function getDatabaseStats() {
  const database = getDb();
  return {
    path: getDbPath(),
    sessions: (database.prepare("SELECT COUNT(*) as count FROM sessions").get() as { count: number }).count,
    drivers: (database.prepare("SELECT COUNT(*) as count FROM session_drivers").get() as { count: number }).count,
    laps: (database.prepare("SELECT COUNT(*) as count FROM laps").get() as { count: number }).count,
    weather: (database.prepare("SELECT COUNT(*) as count FROM weather").get() as { count: number }).count,
    events: (database.prepare("SELECT COUNT(*) as count FROM race_events").get() as { count: number }).count,
  };
}
