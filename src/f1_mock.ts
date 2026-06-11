// Mock data of Formula 1 sessions to fallback on if the public API fails or is slow.
export interface Driver {
  driver_number: number;
  broadcast_name: string;
  full_name: string;
  name_acronym: string;
  team_name: string;
  team_colour: string;
  headshot_url: string;
}

export interface Lap {
  lap_number: number;
  lap_duration: number | null;
  duration_sector_1: number | null;
  duration_sector_2: number | null;
  duration_sector_3: number | null;
  is_pit_out_lap: boolean;
}

export interface WeatherCondition {
  date: string;
  air_temperature: number;
  track_temperature: number;
  humidity: number;
  rainfall: number;
}

export interface RaceEvent {
  date: string;
  lap_number: number | null;
  category: string;
  message: string;
  flag: string | null;
}

export interface SessionInfo {
  session_key: number;
  session_name: string;
  session_type: string;
  meeting_key: number;
  meeting_name: string;
  location: string;
  country_name: string;
  year: number;
  date_start: string;
}

export interface MockSessionData {
  session: SessionInfo;
  drivers: Driver[];
  laps: Record<number, Lap[]>; // driverNumber -> Laps
  weather: WeatherCondition[];
  events: RaceEvent[];
}

export const MOCK_SESSIONS: Record<number, MockSessionData> = {
  // Monaco Grand Prix 2024 Race (Session Key: 9507)
  9507: {
    session: {
      session_key: 9507,
      session_name: "Race",
      session_type: "Race",
      meeting_key: 1235,
      meeting_name: "Monaco Grand Prix",
      location: "Monaco",
      country_name: "Monaco",
      year: 2024,
      date_start: "2024-05-26T13:00:00Z"
    },
    drivers: [
      {
        driver_number: 16,
        broadcast_name: "C LECLERC",
        full_name: "Charles Leclerc",
        name_acronym: "LEC",
        team_name: "Ferrari",
        team_colour: "E80020",
        headshot_url: "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/C/CHALEC01_Charles_Leclerc/chalec01.png"
      },
      {
        driver_number: 81,
        broadcast_name: "O PIASTRI",
        full_name: "Oscar Piastri",
        name_acronym: "PIA",
        team_name: "McLaren",
        team_colour: "FF8000",
        headshot_url: "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/O/OSCPIA01_Oscar_Piastri/oscpia01.png"
      },
      {
        driver_number: 55,
        broadcast_name: "C SAINZ",
        full_name: "Carlos Sainz",
        name_acronym: "SAI",
        team_name: "Ferrari",
        team_colour: "E80020",
        headshot_url: "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/C/CARSAI01_Carlos_Sainz/carsai01.png"
      },
      {
        driver_number: 4,
        broadcast_name: "L NORRIS",
        full_name: "Lando Norris",
        name_acronym: "NOR",
        team_name: "McLaren",
        team_colour: "FF8000",
        headshot_url: "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/L/LANNOR01_Lando_Norris/lannor01.png"
      },
      {
        driver_number: 63,
        broadcast_name: "G RUSSELL",
        full_name: "George Russell",
        name_acronym: "RUS",
        team_name: "Mercedes",
        team_colour: "27F4D2",
        headshot_url: "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/G/GEORUS01_George_Russell/georus01.png"
      },
      {
        driver_number: 1,
        broadcast_name: "M VERSTAPPEN",
        full_name: "Max Verstappen",
        name_acronym: "VER",
        team_name: "Red Bull Racing",
        team_colour: "3671C6",
        headshot_url: "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/M/MAXVER01_Max_Verstappen/maxver01.png"
      },
      {
        driver_number: 44,
        broadcast_name: "L HAMILTON",
        full_name: "Lewis Hamilton",
        name_acronym: "HAM",
        team_name: "Mercedes",
        team_colour: "27F4D2",
        headshot_url: "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/L/LEWHAM01_Lewis_Hamilton/lewham01.png"
      },
      {
        driver_number: 22,
        broadcast_name: "Y TSUNODA",
        full_name: "Yuki Tsunoda",
        name_acronym: "TSU",
        team_name: "RB",
        team_colour: "6692FF",
        headshot_url: "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/Y/YUKTSU01_Yuki_Tsunoda/yuktsu01.png"
      }
    ],
    laps: {
      16: [
        { lap_number: 1, lap_duration: 110.5, duration_sector_1: 45.1, duration_sector_2: 38.2, duration_sector_3: 27.2, is_pit_out_lap: true },
        { lap_number: 2, lap_duration: 77.2, duration_sector_1: 22.1, duration_sector_2: 32.5, duration_sector_3: 22.6, is_pit_out_lap: false },
        { lap_number: 3, lap_duration: 76.5, duration_sector_1: 21.9, duration_sector_2: 32.2, duration_sector_3: 22.4, is_pit_out_lap: false },
        { lap_number: 4, lap_duration: 76.1, duration_sector_1: 21.8, duration_sector_2: 32.1, duration_sector_3: 22.2, is_pit_out_lap: false },
        { lap_number: 5, lap_duration: 75.8, duration_sector_1: 21.6, duration_sector_2: 32.0, duration_sector_3: 22.2, is_pit_out_lap: false },
        { lap_number: 6, lap_duration: 75.4, duration_sector_1: 21.5, duration_sector_2: 31.8, duration_sector_3: 22.1, is_pit_out_lap: false },
        { lap_number: 7, lap_duration: 75.1, duration_sector_1: 21.4, duration_sector_2: 31.7, duration_sector_3: 22.0, is_pit_out_lap: false },
        { lap_number: 8, lap_duration: 74.8, duration_sector_1: 21.3, duration_sector_2: 31.6, duration_sector_3: 21.9, is_pit_out_lap: false }
      ],
      81: [
        { lap_number: 1, lap_duration: 111.9, duration_sector_1: 45.8, duration_sector_2: 38.5, duration_sector_3: 27.6, is_pit_out_lap: true },
        { lap_number: 2, lap_duration: 77.8, duration_sector_1: 22.3, duration_sector_2: 32.7, duration_sector_3: 22.8, is_pit_out_lap: false },
        { lap_number: 3, lap_duration: 76.9, duration_sector_1: 22.0, duration_sector_2: 32.4, duration_sector_3: 22.5, is_pit_out_lap: false },
        { lap_number: 4, lap_duration: 76.4, duration_sector_1: 21.9, duration_sector_2: 32.2, duration_sector_3: 22.3, is_pit_out_lap: false },
        { lap_number: 5, lap_duration: 76.0, duration_sector_1: 21.7, duration_sector_2: 32.0, duration_sector_3: 22.3, is_pit_out_lap: false },
        { lap_number: 6, lap_duration: 75.6, duration_sector_1: 21.6, duration_sector_2: 31.9, duration_sector_3: 22.1, is_pit_out_lap: false },
        { lap_number: 7, lap_duration: 75.3, duration_sector_1: 21.4, duration_sector_2: 31.8, duration_sector_3: 22.1, is_pit_out_lap: false },
        { lap_number: 8, lap_duration: 75.0, duration_sector_1: 21.3, duration_sector_2: 31.7, duration_sector_3: 22.0, is_pit_out_lap: false }
      ],
      55: [
        { lap_number: 1, lap_duration: 112.5, duration_sector_1: 46.2, duration_sector_2: 38.8, duration_sector_3: 27.5, is_pit_out_lap: true },
        { lap_number: 2, lap_duration: 78.1, duration_sector_1: 22.4, duration_sector_2: 32.8, duration_sector_3: 22.9, is_pit_out_lap: false },
        { lap_number: 3, lap_duration: 77.2, duration_sector_1: 22.1, duration_sector_2: 32.5, duration_sector_3: 22.6, is_pit_out_lap: false },
        { lap_number: 4, lap_duration: 76.7, duration_sector_1: 22.0, duration_sector_2: 32.3, duration_sector_3: 22.4, is_pit_out_lap: false },
        { lap_number: 5, lap_duration: 76.3, duration_sector_1: 21.8, duration_sector_2: 32.1, duration_sector_3: 22.4, is_pit_out_lap: false },
        { lap_number: 6, lap_duration: 75.9, duration_sector_1: 21.7, duration_sector_2: 32.0, duration_sector_3: 22.2, is_pit_out_lap: false },
        { lap_number: 7, lap_duration: 75.4, duration_sector_1: 21.5, duration_sector_2: 31.8, duration_sector_3: 22.1, is_pit_out_lap: false },
        { lap_number: 8, lap_duration: 75.1, duration_sector_1: 21.4, duration_sector_2: 31.7, duration_sector_3: 22.0, is_pit_out_lap: false }
      ],
      4: [
        { lap_number: 1, lap_duration: 113.1, duration_sector_1: 46.5, duration_sector_2: 39.0, duration_sector_3: 27.6, is_pit_out_lap: true },
        { lap_number: 2, lap_duration: 78.4, duration_sector_1: 22.5, duration_sector_2: 32.9, duration_sector_3: 23.0, is_pit_out_lap: false },
        { lap_number: 3, lap_duration: 77.4, duration_sector_1: 22.2, duration_sector_2: 32.6, duration_sector_3: 22.6, is_pit_out_lap: false },
        { lap_number: 4, lap_duration: 76.8, duration_sector_1: 22.1, duration_sector_2: 32.3, duration_sector_3: 22.4, is_pit_out_lap: false },
        { lap_number: 5, lap_duration: 76.3, duration_sector_1: 21.8, duration_sector_2: 32.1, duration_sector_3: 22.4, is_pit_out_lap: false },
        { lap_number: 6, lap_duration: 75.8, duration_sector_1: 21.7, duration_sector_2: 32.0, duration_sector_3: 22.1, is_pit_out_lap: false },
        { lap_number: 7, lap_duration: 75.4, duration_sector_1: 21.5, duration_sector_2: 31.8, duration_sector_3: 22.1, is_pit_out_lap: false },
        { lap_number: 8, lap_duration: 75.1, duration_sector_1: 21.4, duration_sector_2: 31.7, duration_sector_3: 22.0, is_pit_out_lap: false }
      ],
      1: [
        { lap_number: 1, lap_duration: 114.5, duration_sector_1: 47.1, duration_sector_2: 39.5, duration_sector_3: 27.9, is_pit_out_lap: true },
        { lap_number: 2, lap_duration: 78.9, duration_sector_1: 22.7, duration_sector_2: 33.1, duration_sector_3: 23.1, is_pit_out_lap: false },
        { lap_number: 3, lap_duration: 77.9, duration_sector_1: 22.3, duration_sector_2: 32.8, duration_sector_3: 22.8, is_pit_out_lap: false },
        { lap_number: 4, lap_duration: 77.3, duration_sector_1: 22.1, duration_sector_2: 32.5, duration_sector_3: 22.7, is_pit_out_lap: false },
        { lap_number: 5, lap_duration: 76.9, duration_sector_1: 21.9, duration_sector_2: 32.3, duration_sector_3: 22.7, is_pit_out_lap: false },
        { lap_number: 6, lap_duration: 76.4, duration_sector_1: 21.8, duration_sector_2: 32.1, duration_sector_3: 22.5, is_pit_out_lap: false },
        { lap_number: 7, lap_duration: 75.9, duration_sector_1: 21.6, duration_sector_2: 31.9, duration_sector_3: 22.4, is_pit_out_lap: false },
        { lap_number: 8, lap_duration: 75.3, duration_sector_1: 21.5, duration_sector_2: 31.6, duration_sector_3: 22.2, is_pit_out_lap: false }
      ],
      63: [
        { lap_number: 1, lap_duration: 113.8, duration_sector_1: 46.9, duration_sector_2: 39.2, duration_sector_3: 27.7, is_pit_out_lap: true },
        { lap_number: 2, lap_duration: 78.5, duration_sector_1: 22.6, duration_sector_2: 33.0, duration_sector_3: 22.9, is_pit_out_lap: false },
        { lap_number: 3, lap_duration: 77.6, duration_sector_1: 22.2, duration_sector_2: 32.7, duration_sector_3: 22.7, is_pit_out_lap: false },
        { lap_number: 4, lap_duration: 77.1, duration_sector_1: 22.0, duration_sector_2: 32.5, duration_sector_3: 22.6, is_pit_out_lap: false },
        { lap_number: 5, lap_duration: 76.6, duration_sector_1: 21.8, duration_sector_2: 32.3, duration_sector_3: 22.5, is_pit_out_lap: false },
        { lap_number: 6, lap_duration: 76.1, duration_sector_1: 21.7, duration_sector_2: 32.1, duration_sector_3: 22.3, is_pit_out_lap: false },
        { lap_number: 7, lap_duration: 75.6, duration_sector_1: 21.5, duration_sector_2: 31.9, duration_sector_3: 22.2, is_pit_out_lap: false },
        { lap_number: 8, lap_duration: 75.3, duration_sector_1: 21.4, duration_sector_2: 31.8, duration_sector_3: 22.1, is_pit_out_lap: false }
      ],
      44: [
        { lap_number: 1, lap_duration: 114.2, duration_sector_1: 47.0, duration_sector_2: 39.4, duration_sector_3: 27.8, is_pit_out_lap: true },
        { lap_number: 2, lap_duration: 78.6, duration_sector_1: 22.6, duration_sector_2: 33.1, duration_sector_3: 22.9, is_pit_out_lap: false },
        { lap_number: 3, lap_duration: 77.4, duration_sector_1: 22.1, duration_sector_2: 32.6, duration_sector_3: 22.7, is_pit_out_lap: false },
        { lap_number: 4, lap_duration: 76.9, duration_sector_1: 22.0, duration_sector_2: 32.4, duration_sector_3: 22.5, is_pit_out_lap: false },
        { lap_number: 5, lap_duration: 76.4, duration_sector_1: 21.8, duration_sector_2: 32.2, duration_sector_3: 22.4, is_pit_out_lap: false },
        { lap_number: 6, lap_duration: 75.9, duration_sector_1: 21.7, duration_sector_2: 32.0, duration_sector_3: 22.2, is_pit_out_lap: false },
        { lap_number: 7, lap_duration: 75.3, duration_sector_1: 21.5, duration_sector_2: 31.7, duration_sector_3: 22.1, is_pit_out_lap: false },
        { lap_number: 8, lap_duration: 74.9, duration_sector_1: 21.4, duration_sector_2: 31.6, duration_sector_3: 21.9, is_pit_out_lap: false }
      ],
      22: [
        { lap_number: 1, lap_duration: 115.1, duration_sector_1: 47.4, duration_sector_2: 39.8, duration_sector_3: 27.9, is_pit_out_lap: true },
        { lap_number: 2, lap_duration: 79.2, duration_sector_1: 22.8, duration_sector_2: 33.3, duration_sector_3: 23.1, is_pit_out_lap: false },
        { lap_number: 3, lap_duration: 78.3, duration_sector_1: 22.4, duration_sector_2: 33.0, duration_sector_3: 22.9, is_pit_out_lap: false },
        { lap_number: 4, lap_duration: 77.7, duration_sector_1: 22.2, duration_sector_2: 32.7, duration_sector_3: 22.8, is_pit_out_lap: false },
        { lap_number: 5, lap_duration: 77.2, duration_sector_1: 22.0, duration_sector_2: 32.4, duration_sector_3: 22.8, is_pit_out_lap: false },
        { lap_number: 6, lap_duration: 76.8, duration_sector_1: 21.9, duration_sector_2: 32.2, duration_sector_3: 22.7, is_pit_out_lap: false },
        { lap_number: 7, lap_duration: 76.3, duration_sector_1: 21.7, duration_sector_2: 32.0, duration_sector_3: 22.6, is_pit_out_lap: false },
        { lap_number: 8, lap_duration: 75.9, duration_sector_1: 21.6, duration_sector_2: 31.8, duration_sector_3: 22.5, is_pit_out_lap: false }
      ]
    },
    weather: [
      { date: "2024-05-26T13:00:00Z", air_temperature: 21.4, track_temperature: 34.6, humidity: 55, rainfall: 0 },
      { date: "2024-05-26T13:15:00Z", air_temperature: 21.6, track_temperature: 35.2, humidity: 54, rainfall: 0 },
      { date: "2024-05-26T13:30:00Z", air_temperature: 21.8, track_temperature: 35.8, humidity: 53, rainfall: 0 },
      { date: "2024-05-26T13:45:00Z", air_temperature: 22.0, track_temperature: 35.4, humidity: 53, rainfall: 0 },
      { date: "2024-05-26T14:00:00Z", air_temperature: 22.1, track_temperature: 34.9, humidity: 54, rainfall: 0 },
      { date: "2024-05-26T14:15:00Z", air_temperature: 21.9, track_temperature: 34.1, humidity: 55, rainfall: 0 },
      { date: "2024-05-26T14:30:00Z", air_temperature: 21.7, track_temperature: 33.5, humidity: 56, rainfall: 0 }
    ],
    events: [
      { date: "2024-05-26T13:01:15Z", lap_number: 1, category: "Flag", message: "RED FLAG - Session suspended after high-speed crash between Perez, Magnussen, and Hulkenberg at Beau Rivage", flag: "RED" },
      { date: "2024-05-26T13:44:00Z", lap_number: 1, category: "Status", message: "RESTART - Race restarted with standing start after track cleanup and repairs", flag: "GREEN" },
      { date: "2024-05-26T13:46:12Z", lap_number: 2, category: "Technical", message: "DRS ENABLED - Race direction enabled the Drag Reduction System", flag: null },
      { date: "2024-05-26T14:12:45Z", lap_number: 5, category: "Incident", message: "YELLOW FLAG Sector 2 - Carlos Sainz punctured tire. Resumed race after immediate pitstop under red flag", flag: "YELLOW" },
      { date: "2024-05-26T14:26:30Z", lap_number: 7, category: "Status", message: "TRACK CLEAR - Yellow flag in Sector 2 cleared, full green-flag racing", flag: "GREEN" }
    ]
  },

  // British Grand Prix 2024 Race (Session Key: 9541)
  9541: {
    session: {
      session_key: 9541,
      session_name: "Race",
      session_type: "Race",
      meeting_key: 1239,
      meeting_name: "British Grand Prix",
      location: "Silverstone",
      country_name: "Great Britain",
      year: 2024,
      date_start: "2024-07-07T14:00:00Z"
    },
    drivers: [
      {
        driver_number: 44,
        broadcast_name: "L HAMILTON",
        full_name: "Lewis Hamilton",
        name_acronym: "HAM",
        team_name: "Mercedes",
        team_colour: "27F4D2",
        headshot_url: "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/L/LEWHAM01_Lewis_Hamilton/lewham01.png"
      },
      {
        driver_number: 1,
        broadcast_name: "M VERSTAPPEN",
        full_name: "Max Verstappen",
        name_acronym: "VER",
        team_name: "Red Bull Racing",
        team_colour: "3671C6",
        headshot_url: "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/M/MAXVER01_Max_Verstappen/maxver01.png"
      },
      {
        driver_number: 4,
        broadcast_name: "L NORRIS",
        full_name: "Lando Norris",
        name_acronym: "NOR",
        team_name: "McLaren",
        team_colour: "FF8000",
        headshot_url: "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/L/LANNOR01_Lando_Norris/lannor01.png"
      },
      {
        driver_number: 81,
        broadcast_name: "O PIASTRI",
        full_name: "Oscar Piastri",
        name_acronym: "PIA",
        team_name: "McLaren",
        team_colour: "FF8000",
        headshot_url: "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/O/OSCPIA01_Oscar_Piastri/oscpia01.png"
      },
      {
        driver_number: 55,
        broadcast_name: "C SAINZ",
        full_name: "Carlos Sainz",
        name_acronym: "SAI",
        team_name: "Ferrari",
        team_colour: "E80020",
        headshot_url: "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/C/CARSAI01_Carlos_Sainz/carsai01.png"
      },
      {
        driver_number: 27,
        broadcast_name: "N HULKENBERG",
        full_name: "Nico Hulkenberg",
        name_acronym: "HUL",
        team_name: "Haas",
        team_colour: "B6BABD",
        headshot_url: "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/N/NICHUL01_Nico_Hulkenberg/nichul01.png"
      },
      {
        driver_number: 18,
        broadcast_name: "L STROLL",
        full_name: "Lance Stroll",
        name_acronym: "STR",
        team_name: "Aston Martin",
        team_colour: "229971",
        headshot_url: "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/L/LANSTR01_Lance_Stroll/lanstr01.png"
      },
      {
        driver_number: 14,
        broadcast_name: "F ALONSO",
        full_name: "Fernando Alonso",
        name_acronym: "ALO",
        team_name: "Aston Martin",
        team_colour: "229971",
        headshot_url: "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/F/FERALO01_Fernando_Alonso/feralo01.png"
      }
    ],
    laps: {
      44: [
        { lap_number: 1, lap_duration: 98.4, duration_sector_1: 30.5, duration_sector_2: 38.4, duration_sector_3: 29.5, is_pit_out_lap: true },
        { lap_number: 2, lap_duration: 90.8, duration_sector_1: 28.1, duration_sector_2: 34.5, duration_sector_3: 28.2, is_pit_out_lap: false },
        { lap_number: 3, lap_duration: 90.2, duration_sector_1: 27.9, duration_sector_2: 34.2, duration_sector_3: 28.1, is_pit_out_lap: false },
        { lap_number: 4, lap_duration: 91.5, duration_sector_1: 28.2, duration_sector_2: 34.8, duration_sector_3: 28.5, is_pit_out_lap: false }, // drizzle starts
        { lap_number: 5, lap_duration: 94.2, duration_sector_1: 29.4, duration_sector_2: 36.1, duration_sector_3: 28.7, is_pit_out_lap: false },
        { lap_number: 6, lap_duration: 102.4, duration_sector_1: 32.5, duration_sector_2: 39.5, duration_sector_3: 30.4, is_pit_out_lap: false }, // rain intensifies
        { lap_number: 7, lap_duration: 101.1, duration_sector_1: 32.0, duration_sector_2: 39.0, duration_sector_3: 30.1, is_pit_out_lap: false },
        { lap_number: 8, lap_duration: 93.4, duration_sector_1: 29.1, duration_sector_2: 35.8, duration_sector_3: 28.5, is_pit_out_lap: false } // wet tires transition
      ],
      1: [
        { lap_number: 1, lap_duration: 99.1, duration_sector_1: 30.8, duration_sector_2: 38.6, duration_sector_3: 29.7, is_pit_out_lap: true },
        { lap_number: 2, lap_duration: 91.2, duration_sector_1: 28.3, duration_sector_2: 34.6, duration_sector_3: 28.3, is_pit_out_lap: false },
        { lap_number: 3, lap_duration: 90.5, duration_sector_1: 28.0, duration_sector_2: 34.3, duration_sector_3: 28.2, is_pit_out_lap: false },
        { lap_number: 4, lap_duration: 92.1, duration_sector_1: 28.4, duration_sector_2: 35.1, duration_sector_3: 28.6, is_pit_out_lap: false },
        { lap_number: 5, lap_duration: 95.8, duration_sector_1: 29.9, duration_sector_2: 36.8, duration_sector_3: 29.1, is_pit_out_lap: false },
        { lap_number: 6, lap_duration: 104.1, duration_sector_1: 33.1, duration_sector_2: 40.2, duration_sector_3: 30.8, is_pit_out_lap: false },
        { lap_number: 7, lap_duration: 100.8, duration_sector_1: 31.8, duration_sector_2: 38.8, duration_sector_3: 30.2, is_pit_out_lap: false },
        { lap_number: 8, lap_duration: 92.9, duration_sector_1: 28.9, duration_sector_2: 35.5, duration_sector_3: 28.5, is_pit_out_lap: false }
      ],
      4: [
        { lap_number: 1, lap_duration: 98.9, duration_sector_1: 30.6, duration_sector_2: 38.5, duration_sector_3: 29.8, is_pit_out_lap: true },
        { lap_number: 2, lap_duration: 90.6, duration_sector_1: 28.0, duration_sector_2: 34.4, duration_sector_3: 28.2, is_pit_out_lap: false },
        { lap_number: 3, lap_duration: 89.9, duration_sector_1: 27.8, duration_sector_2: 34.1, duration_sector_3: 28.0, is_pit_out_lap: false }, // Fastest overall lap in dry conditions
        { lap_number: 4, lap_duration: 91.8, duration_sector_1: 28.3, duration_sector_2: 34.9, duration_sector_3: 28.6, is_pit_out_lap: false },
        { lap_number: 5, lap_duration: 93.9, duration_sector_1: 29.2, duration_sector_2: 36.0, duration_sector_3: 28.7, is_pit_out_lap: false },
        { lap_number: 6, lap_duration: 101.8, duration_sector_1: 32.2, duration_sector_2: 39.1, duration_sector_3: 30.5, is_pit_out_lap: false },
        { lap_number: 7, lap_duration: 101.5, duration_sector_1: 32.1, duration_sector_2: 39.2, duration_sector_3: 30.2, is_pit_out_lap: false },
        { lap_number: 8, lap_duration: 94.1, duration_sector_1: 29.4, duration_sector_2: 36.1, duration_sector_3: 28.6, is_pit_out_lap: false }
      ],
      81: [
        { lap_number: 1, lap_duration: 99.4, duration_sector_1: 30.9, duration_sector_2: 38.7, duration_sector_3: 29.8, is_pit_out_lap: true },
        { lap_number: 2, lap_duration: 91.1, duration_sector_1: 28.2, duration_sector_2: 34.6, duration_sector_3: 28.3, is_pit_out_lap: false },
        { lap_number: 3, lap_duration: 90.4, duration_sector_1: 27.9, duration_sector_2: 34.3, duration_sector_3: 28.2, is_pit_out_lap: false },
        { lap_number: 4, lap_duration: 92.5, duration_sector_1: 28.5, duration_sector_2: 35.2, duration_sector_3: 28.8, is_pit_out_lap: false },
        { lap_number: 5, lap_duration: 94.8, duration_sector_1: 29.4, duration_sector_2: 36.5, duration_sector_3: 28.9, is_pit_out_lap: false },
        { lap_number: 6, lap_duration: 103.5, duration_sector_1: 32.9, duration_sector_2: 39.9, duration_sector_3: 30.7, is_pit_out_lap: false },
        { lap_number: 7, lap_duration: 102.2, duration_sector_1: 32.4, duration_sector_2: 39.4, duration_sector_3: 30.4, is_pit_out_lap: false },
        { lap_number: 8, lap_duration: 95.0, duration_sector_1: 29.8, duration_sector_2: 36.5, duration_sector_3: 28.7, is_pit_out_lap: false }
      ],
      55: [
        { lap_number: 1, lap_duration: 100.2, duration_sector_1: 31.2, duration_sector_2: 39.1, duration_sector_3: 29.9, is_pit_out_lap: true },
        { lap_number: 2, lap_duration: 92.4, duration_sector_1: 28.6, duration_sector_2: 35.2, duration_sector_3: 28.6, is_pit_out_lap: false },
        { lap_number: 3, lap_duration: 91.6, duration_sector_1: 28.3, duration_sector_2: 34.8, duration_sector_3: 28.5, is_pit_out_lap: false },
        { lap_number: 4, lap_duration: 93.9, duration_sector_1: 28.9, duration_sector_2: 36.1, duration_sector_3: 28.9, is_pit_out_lap: false },
        { lap_number: 5, lap_duration: 96.5, duration_sector_1: 30.2, duration_sector_2: 37.1, duration_sector_3: 29.2, is_pit_out_lap: false },
        { lap_number: 6, lap_duration: 105.3, duration_sector_1: 33.5, duration_sector_2: 40.8, duration_sector_3: 31.0, is_pit_out_lap: false },
        { lap_number: 7, lap_duration: 103.8, duration_sector_1: 32.8, duration_sector_2: 40.2, duration_sector_3: 30.8, is_pit_out_lap: false },
        { lap_number: 8, lap_duration: 94.6, duration_sector_1: 29.6, duration_sector_2: 36.2, duration_sector_3: 28.8, is_pit_out_lap: false }
      ],
      27: [
        { lap_number: 1, lap_duration: 101.4, duration_sector_1: 31.8, duration_sector_2: 39.4, duration_sector_3: 30.2, is_pit_out_lap: true },
        { lap_number: 2, lap_duration: 93.1, duration_sector_1: 28.9, duration_sector_2: 35.5, duration_sector_3: 28.7, is_pit_out_lap: false },
        { lap_number: 3, lap_duration: 92.3, duration_sector_1: 28.5, duration_sector_2: 35.1, duration_sector_3: 28.7, is_pit_out_lap: false },
        { lap_number: 4, lap_duration: 94.8, duration_sector_1: 29.3, duration_sector_2: 36.5, duration_sector_3: 29.0, is_pit_out_lap: false },
        { lap_number: 5, lap_duration: 97.2, duration_sector_1: 30.5, duration_sector_2: 37.5, duration_sector_3: 29.2, is_pit_out_lap: false },
        { lap_number: 6, lap_duration: 106.1, duration_sector_1: 33.9, duration_sector_2: 41.1, duration_sector_3: 31.1, is_pit_out_lap: false },
        { lap_number: 7, lap_duration: 104.9, duration_sector_1: 33.2, duration_sector_2: 40.8, duration_sector_3: 30.9, is_pit_out_lap: false },
        { lap_number: 8, lap_duration: 95.8, duration_sector_1: 29.9, duration_sector_2: 36.9, duration_sector_3: 29.0, is_pit_out_lap: false }
      ],
      18: [
        { lap_number: 1, lap_duration: 102.1, duration_sector_1: 32.0, duration_sector_2: 39.6, duration_sector_3: 30.5, is_pit_out_lap: true },
        { lap_number: 2, lap_duration: 93.8, duration_sector_1: 29.1, duration_sector_2: 35.8, duration_sector_3: 28.9, is_pit_out_lap: false },
        { lap_number: 3, lap_duration: 92.9, duration_sector_1: 28.7, duration_sector_2: 35.4, duration_sector_3: 28.8, is_pit_out_lap: false },
        { lap_number: 4, lap_duration: 95.4, duration_sector_1: 29.6, duration_sector_2: 36.8, duration_sector_3: 29.0, is_pit_out_lap: false },
        { lap_number: 5, lap_duration: 98.1, duration_sector_1: 30.8, duration_sector_2: 37.9, duration_sector_3: 29.4, is_pit_out_lap: false },
        { lap_number: 6, lap_duration: 107.0, duration_sector_1: 34.2, duration_sector_2: 41.5, duration_sector_3: 31.3, is_pit_out_lap: false },
        { lap_number: 7, lap_duration: 105.4, duration_sector_1: 33.4, duration_sector_2: 41.1, duration_sector_3: 30.9, is_pit_out_lap: false },
        { lap_number: 8, lap_duration: 96.3, duration_sector_1: 30.1, duration_sector_2: 37.1, duration_sector_3: 29.1, is_pit_out_lap: false }
      ],
      14: [
        { lap_number: 1, lap_duration: 101.8, duration_sector_1: 31.9, duration_sector_2: 39.5, duration_sector_3: 30.4, is_pit_out_lap: true },
        { lap_number: 2, lap_duration: 93.5, duration_sector_1: 29.0, duration_sector_2: 35.6, duration_sector_3: 28.9, is_pit_out_lap: false },
        { lap_number: 3, lap_duration: 92.7, duration_sector_1: 28.6, duration_sector_2: 35.3, duration_sector_3: 28.8, is_pit_out_lap: false },
        { lap_number: 4, lap_duration: 95.1, duration_sector_1: 29.5, duration_sector_2: 36.6, duration_sector_3: 29.0, is_pit_out_lap: false },
        { lap_number: 5, lap_duration: 97.8, duration_sector_1: 30.7, duration_sector_2: 37.7, duration_sector_3: 29.4, is_pit_out_lap: false },
        { lap_number: 6, lap_duration: 106.8, duration_sector_1: 34.1, duration_sector_2: 41.3, duration_sector_3: 31.4, is_pit_out_lap: false },
        { lap_number: 7, lap_duration: 105.1, duration_sector_1: 33.3, duration_sector_2: 41.0, duration_sector_3: 30.8, is_pit_out_lap: false },
        { lap_number: 8, lap_duration: 96.0, duration_sector_1: 30.0, duration_sector_2: 37.0, duration_sector_3: 29.0, is_pit_out_lap: false }
      ]
    },
    weather: [
      { date: "2024-07-07T14:00:00Z", air_temperature: 16.2, track_temperature: 24.1, humidity: 78, rainfall: 0 },
      { date: "2024-07-07T14:15:00Z", air_temperature: 15.9, track_temperature: 22.8, humidity: 82, rainfall: 1 }, // Drizzle starts
      { date: "2024-07-07T14:30:00Z", air_temperature: 15.1, track_temperature: 19.5, humidity: 88, rainfall: 1 }, // Heavy rain
      { date: "2024-07-07T14:45:00Z", air_temperature: 14.8, track_temperature: 18.2, humidity: 92, rainfall: 1 },
      { date: "2024-07-07T15:00:00Z", air_temperature: 15.0, track_temperature: 18.9, humidity: 90, rainfall: 0 }
    ],
    events: [
      { date: "2024-07-07T14:18:22Z", lap_number: 3, category: "Weather", message: "RAIN REPORTED - Light rain drops detected in Sector 2 (Copse / Maggots)", flag: null },
      { date: "2024-07-07T14:24:10Z", lap_number: 5, category: "Flag", message: "YELLOW FLAG Sector 3 - Oscar Piastri went slightly wide on wet grass at Club corner", flag: "YELLOW" },
      { date: "2024-07-07T14:26:00Z", lap_number: 5, category: "Status", message: "TRACK CLEAR - Sector 3 yellow flag cleared", flag: "GREEN" },
      { date: "2024-07-07T14:32:00Z", lap_number: 6, category: "Strategy", message: "PITSTOP - Multi-car strategy transition. Drivers pitting for Intermediate tyres as rainfall increases", flag: null },
      { date: "2024-07-07T14:52:12Z", lap_number: 8, category: "SafetyCar", message: "VIRTUAL SAFETY CAR - Debris on hangar straight after Gasly outlap incident", flag: "VSC" }
    ]
  }
};
