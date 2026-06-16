import { MOCK_SESSIONS, type Lap } from "../f1_mock";

export type RaceResult = {
  round: number;
  raceName: string;
  circuitName: string;
  locality: string;
  country: string;
  date: string;
  winner: string;
  winnerAcronym: string;
  winnerTeam: string;
  time: string;
  simpleSummary: string;
};

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
  [1, "Bahrain Grand Prix", "Bahrain International Circuit", "Sakhir", "Bahrain", "03-02", "Max Verstappen", "Red Bull", "1:31:44.742"],
  [2, "Saudi Arabian Grand Prix", "Jeddah Street Circuit", "Jeddah", "Saudi Arabia", "03-09", "Max Verstappen", "Red Bull", "1:20:43.119"],
  [3, "Australian Grand Prix", "Albert Park Circuit", "Melbourne", "Australia", "03-24", "Carlos Sainz", "Ferrari", "1:20:26.843"],
  [4, "Japanese Grand Prix", "Suzuka International Racing Course", "Suzuka", "Japan", "04-07", "Max Verstappen", "Red Bull", "1:54:23.566"],
  [5, "Chinese Grand Prix", "Shanghai International Circuit", "Shanghai", "China", "04-21", "Max Verstappen", "Red Bull", "1:40:52.554"],
  [6, "Miami Grand Prix", "Miami International Autodrome", "Miami", "USA", "05-05", "Lando Norris", "McLaren", "1:30:49.876"],
  [7, "Emilia Romagna Grand Prix", "Autodromo Enzo e Dino Ferrari", "Imola", "Italy", "05-19", "Max Verstappen", "Red Bull", "1:25:25.252"],
  [8, "Monaco Grand Prix", "Circuit de Monaco", "Monte Carlo", "Monaco", "05-26", "Charles Leclerc", "Ferrari", "1:41:22.001"],
  [9, "Canadian Grand Prix", "Circuit Gilles Villeneuve", "Montreal", "Canada", "06-09", "Max Verstappen", "Red Bull", "1:28:30.410"],
  [10, "Spanish Grand Prix", "Circuit de Barcelona-Catalunya", "Barcelona", "Spain", "06-23", "Max Verstappen", "Red Bull", "1:29:05.112"],
  [11, "Austrian Grand Prix", "Red Bull Ring", "Spielberg", "Austria", "06-30", "George Russell", "Mercedes", "1:24:22.410"],
  [12, "British Grand Prix", "Silverstone Circuit", "Silverstone", "UK", "07-07", "Lewis Hamilton", "Mercedes", "1:29:12.441"],
  [13, "Hungarian Grand Prix", "Hungaroring", "Budapest", "Hungary", "07-21", "Oscar Piastri", "McLaren", "1:38:01.992"],
  [14, "Belgian Grand Prix", "Circuit de Spa-Francorchamps", "Spa", "Belgium", "07-28", "Lewis Hamilton", "Mercedes", "1:19:57.510"],
  [15, "Dutch Grand Prix", "Circuit Zandvoort", "Zandvoort", "Netherlands", "08-25", "Lando Norris", "McLaren", "1:30:45.519"],
  [16, "Italian Grand Prix", "Autodromo Nazionale Monza", "Monza", "Italy", "08-31", "Charles Leclerc", "Ferrari", "1:14:40.727"],
  [17, "Azerbaijan Grand Prix", "Baku City Circuit", "Baku", "Azerbaijan", "09-15", "Oscar Piastri", "McLaren", "1:32:58.007"],
  [18, "Singapore Grand Prix", "Marina Bay Street Circuit", "Singapore", "Singapore", "09-22", "Lando Norris", "McLaren", "1:40:50.571"],
  [19, "United States Grand Prix", "Circuit of the Americas", "Austin", "USA", "10-20", "Charles Leclerc", "Ferrari", "1:35:09.631"],
  [20, "Mexico City Grand Prix", "Autódromo Hermanos Rodríguez", "Mexico City", "Mexico", "10-27", "Carlos Sainz", "Ferrari", "1:40:55.807"],
  [21, "São Paulo Grand Prix", "Autódromo José Carlos Pace", "São Paulo", "Brazil", "11-03", "Max Verstappen", "Red Bull", "2:06:54.430"],
  [22, "Las Vegas Grand Prix", "Las Vegas Strip Circuit", "Las Vegas", "USA", "11-23", "George Russell", "Mercedes", "1:22:05.992"],
  [23, "Qatar Grand Prix", "Lusail International Circuit", "Lusail", "Qatar", "12-01", "Max Verstappen", "Red Bull", "1:31:05.323"],
  [24, "Abu Dhabi Grand Prix", "Yas Marina Circuit", "Yas Marina", "UAE", "12-08", "Lewis Hamilton", "Mercedes", "1:39:45.302"],
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

export function parseYear(raw: unknown, fallback = 2025) {
  const year = Number(raw || fallback);
  return Number.isFinite(year) ? year : fallback;
}

function getBaseMock(keyOffset: number) {
  return MOCK_SESSIONS[keyOffset % 2 === 1 ? 9507 : 9541] || MOCK_SESSIONS[9507] || Object.values(MOCK_SESSIONS)[0];
}

export function getSessionsByYear(year: number) {
  return sessionTemplates.map((template) => {
    const month = String(template.month).padStart(2, "0");
    const day = String(template.day).padStart(2, "0");
    return {
      session_key: year * 1000 + template.keyOffset,
      session_name: "Race",
      session_type: "Race",
      meeting_key: year * 100 + template.keyOffset,
      meeting_name: `${template.name} (${year})`,
      location: template.location,
      country_name: template.country,
      year,
      date_start: `${year}-${month}-${day}T14:00:00Z`,
    };
  }).sort((a, b) => new Date(b.date_start).getTime() - new Date(a.date_start).getTime());
}

export function getSessionData(sessionKey: number) {
  const year = Math.floor(sessionKey / 1000);
  const keyOffset = sessionKey % 1000;
  const session = getSessionsByYear(year).find((item) => item.session_key === sessionKey);
  const base = getBaseMock(keyOffset);
  if (!session || !base) return null;
  return {
    session,
    drivers: base.drivers,
    weather: base.weather,
    events: base.events,
    laps: {},
  };
}

export function getDriverLaps(sessionKey: number, driverNumber: number) {
  const keyOffset = sessionKey % 1000;
  const base = getBaseMock(keyOffset);
  if (!base) return [];
  const firstDriver = Number(Object.keys(base.laps)[0]);
  const sourceLaps = base.laps[driverNumber] || base.laps[firstDriver] || [];
  const scale = 1 + (((driverNumber * 17) % 31) - 15) / 500;
  return sourceLaps.map((lap: Lap) => ({
    ...lap,
    lap_duration: lap.lap_duration ? Number((lap.lap_duration * scale).toFixed(3)) : null,
    duration_sector_1: lap.duration_sector_1 ? Number((lap.duration_sector_1 * scale).toFixed(3)) : null,
    duration_sector_2: lap.duration_sector_2 ? Number((lap.duration_sector_2 * scale).toFixed(3)) : null,
    duration_sector_3: lap.duration_sector_3 ? Number((lap.duration_sector_3 * scale).toFixed(3)) : null,
  }));
}

export function getStandings(year: number) {
  return {
    drivers: driverStandings.map((item) => ({ ...item })),
    constructors: constructorStandings.map((item) => ({ ...item })),
  };
}

export function getRaceResults(year: number): RaceResult[] {
  return baseRaceResults.map(([round, raceName, circuitName, locality, country, mmdd, winner, winnerTeam, time]) => ({
    round,
    raceName,
    circuitName,
    locality,
    country,
    date: `${year}-${mmdd}`,
    winner,
    winnerAcronym: winner,
    winnerTeam,
    time,
    simpleSummary: `Гонку выиграл ${winner}. Команда: ${winnerTeam}. Место: ${locality}, ${country}.`,
  }));
}

export function getDataStatus() {
  const sessions = getSessionsByYear(2025).length;
  const races = getRaceResults(2025).length;
  const sample = getSessionData(2025001);
  return {
    source: "Vercel local data module",
    sessions,
    races,
    driversInSampleSession: sample?.drivers.length || 0,
    note: "Данные лежат внутри проекта и отдаются через Vercel API Functions.",
  };
}
