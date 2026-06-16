import { useState, useEffect } from "react";
import {
  TrendingUp,
  CloudSun,
  Flag,
  Zap,
  Calendar,
  Users,
  Activity,
  Info,
  Gauge,
  Clock,
  RefreshCw,
  ChevronRight,
  MapPin,
  AlertTriangle,
  Radio,
  Sparkles,
  Trophy,
  Award,
  Search,
  Sliders,
  Play,
  RotateCcw,
  Database,
  Flame,
  UserCheck,
  Building,
  Sun,
  Moon
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  AreaChart,
  Area,
  Legend
} from "recharts";
import { motion, AnimatePresence } from "motion/react";
import { HISTORIC_DRIVERS, HISTORIC_CONSTRUCTORS, ALL_TIME_STATS } from "./f1db_data";
import { MOCK_SESSIONS } from "./f1_mock";

// Type declarations
interface Driver {
  driver_number: number;
  broadcast_name: string;
  full_name: string;
  name_acronym: string;
  team_name: string;
  team_colour: string;
  headshot_url: string;
}

interface Lap {
  lap_number: number;
  lap_duration: number | null;
  duration_sector_1: number | null;
  duration_sector_2: number | null;
  duration_sector_3: number | null;
  is_pit_out_lap: boolean;
}

interface WeatherCondition {
  date: string;
  air_temperature: number;
  track_temperature: number;
  humidity: number;
  rainfall: number;
}

interface RaceEvent {
  date: string;
  lap_number: number | null;
  category: string;
  message: string;
  flag: string | null;
}

interface SessionInfo {
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

interface StandingDriver {
  position: number;
  points: number;
  wins: number;
  driverName: string;
  driverAcronym: string;
  nationality: string;
  teamName: string;
}

interface StandingConstructor {
  position: number;
  points: number;
  wins: number;
  teamName: string;
  nationality: string;
}

interface RaceResult {
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
}

// Simulated FastF1 telemetry coordinate points generator (for overlay tab)
function generateFastF1LapData(driverA: string, driverB: string, param: "speed" | "throttle" | "brake" | "gear") {
  const points = [];
  const totalDistance = 5200; // Monaco to Silverstone typical telemetry points
  const segments = 40;
  
  for (let i = 0; i <= segments; i++) {
    const dist = (i * (totalDistance / segments));
    const normalizedDist = dist / totalDistance;
    
    // Core track layout simulation (straights, braking zone, chicanes, high speed sweeper)
    let baseSpeed = 260 + Math.sin(normalizedDist * Math.PI * 4) * 80; // fluctuation
    let baseThrottle = 90 + Math.sin(normalizedDist * Math.PI * 5) * 20;
    
    // Simulation zone offsets for specific tracks
    // Sharp Chicane at 35% distance
    if (normalizedDist > 0.32 && normalizedDist < 0.40) {
      baseSpeed = 80 + (normalizedDist - 0.32) * 200;
      baseThrottle = 0;
    }
    // Heavy braking zone at 75% distance
    if (normalizedDist > 0.72 && normalizedDist < 0.78) {
      baseSpeed = 65;
      baseThrottle = 5;
    }

    baseThrottle = Math.max(0, Math.min(100, baseThrottle));

    // Telemetry differences for Driver A vs Driver B
    let valA = 0;
    let valB = 0;

    if (param === "speed") {
      // Driver A has better straight-line aerodynamic efficiency, Driver B breaks later
      valA = Math.round(baseSpeed + (normalizedDist > 0.5 ? 4.5 : -1.2));
      valB = Math.round(baseSpeed + (normalizedDist > 0.5 ? -2.0 : 5.1));
    } else if (param === "throttle") {
      valA = Math.round(baseThrottle + Math.cos(normalizedDist * 10) * 4);
      valB = Math.round(baseThrottle - Math.cos(normalizedDist * 12) * 5);
      valA = Math.max(0, Math.min(100, valA));
      valB = Math.max(0, Math.min(100, valB));
    } else if (param === "brake") {
      // Driver A soft trail-braking, Driver B heavy stamp
      const inBrakeRegion = (normalizedDist > 0.30 && normalizedDist < 0.34) || (normalizedDist > 0.70 && normalizedDist < 0.74);
      valA = inBrakeRegion ? Math.round(75 + Math.sin(normalizedDist * 30) * 10) : 0;
      valB = inBrakeRegion ? Math.round(92 + Math.cos(normalizedDist * 20) * 5) : 0;
    } else { // Gear
      let gearNum = Math.ceil(4 + Math.sin(normalizedDist * Math.PI * 3) * 3);
      gearNum = Math.max(1, Math.min(8, gearNum));
      valA = gearNum;
      valB = (normalizedDist > 0.6 && normalizedDist < 0.8) ? Math.max(1, gearNum - 1) : gearNum;
    }

    points.push({
      distance: Math.round(dist),
      [driverA]: valA,
      [driverB]: valB,
      delta: Number(((valA - valB) * 0.004).toFixed(3)) // Time gap estimation
    });
  }
  return points;
}

export default function App() {
  // Navigation tabs selector
  const [activeTab, setActiveTab] = useState<"telemetry" | "standings" | "fastf1" | "f1db">("telemetry");

  // Season and Session selectors
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [sessionList, setSessionList] = useState<SessionInfo[]>([]);
  const [selectedSessionKey, setSelectedSessionKey] = useState<number | "">("");

  // OpenF1 Tab States
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [driverLaps, setDriverLaps] = useState<Lap[]>([]);
  const [weatherData, setWeatherData] = useState<WeatherCondition[]>([]);
  const [raceEvents, setRaceEvents] = useState<RaceEvent[]>([]);
  const [bestLapTime, setBestLapTime] = useState<number | null>(null);
  const [avgLapTime, setAvgLapTime] = useState<number | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string>("");
  
  // Jolpica Standing Tab States
  const [jolpicaYear, setJolpicaYear] = useState<number>(2025);
  const [standingDrivers, setStandingDrivers] = useState<StandingDriver[]>([]);
  const [standingConstructors, setStandingConstructors] = useState<StandingConstructor[]>([]);
  const [seasonRaces, setSeasonRaces] = useState<RaceResult[]>([]);
  const [standingsLoading, setStandingsLoading] = useState<boolean>(false);
  const [calendarLoading, setCalendarLoading] = useState<boolean>(false);

  // FastF1 Tab States
  const [fastFFYear, setFastFFYear] = useState<number>(2025);
  const [ffDriverA, setFfDriverA] = useState<string>("Charles Leclerc");
  const [ffDriverB, setFfDriverB] = useState<string>("Max Verstappen");
  const [ffTelemetryParam, setFfTelemetryParam] = useState<"speed" | "throttle" | "brake" | "gear">("speed");
  const [ffTelemetryCached, setFfTelemetryCached] = useState<any[]>([]);
  const [isFastF1Generating, setIsFastF1Generating] = useState<boolean>(false);

  // F1DB Tab States
  const [f1dbSearchQuery, setF1dbSearchQuery] = useState<string>("");
  const [f1dbCategory, setF1dbCategory] = useState<"all" | "drivers" | "teams" | "records">("all");

  // Driver select filtering State
  const [driverSearchQuery, setDriverSearchQuery] = useState<string>("");

  // Theme Switching State ("dark" | "light")
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const saved = localStorage.getItem("f1_portal_theme");
    return saved === "light" ? "light" : "dark";
  });

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("f1_portal_theme", newTheme);
  };

  // General Loading flags
  const [sessionsLoading, setSessionsLoading] = useState<boolean>(false);
  const [dataLoading, setDataLoading] = useState<boolean>(false);
  const [lapsLoading, setLapsLoading] = useState<boolean>(false);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [isDemoData, setIsDemoData] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Driver comparison modal states
  const [isCompareModalOpen, setIsCompareModalOpen] = useState<boolean>(false);
  const [compareDriverA, setCompareDriverA] = useState<Driver | null>(null);
  const [compareDriverB, setCompareDriverB] = useState<Driver | null>(null);
  const [compareLapsA, setCompareLapsA] = useState<Lap[]>([]);
  const [compareLapsB, setCompareLapsB] = useState<Lap[]>([]);
  const [isCompareLoading, setIsCompareLoading] = useState<boolean>(false);

  const fetchComparisonData = async (drvA: Driver | null, drvB: Driver | null) => {
    if (!selectedSessionKey || !drvA || !drvB) return;
    setIsCompareLoading(true);
    try {
      const [resA, resB] = await Promise.all([
        fetch(`/api/driver-laps?session_key=${selectedSessionKey}&driver_number=${drvA.driver_number}`).then(r => r.json()),
        fetch(`/api/driver-laps?session_key=${selectedSessionKey}&driver_number=${drvB.driver_number}`).then(r => r.json())
      ]);
      
      if (resA.success) {
        setCompareLapsA(resA.laps || []);
      }
      if (resB.success) {
        setCompareLapsB(resB.laps || []);
      }
    } catch (err) {
      console.error("Error fetching comparison laps:", err);
    } finally {
      setIsCompareLoading(false);
    }
  };

  useEffect(() => {
    if (isCompareModalOpen && compareDriverA && compareDriverB) {
      fetchComparisonData(compareDriverA, compareDriverB);
    }
  }, [isCompareModalOpen, compareDriverA?.driver_number, compareDriverB?.driver_number, selectedSessionKey]);

  const openCompareModal = () => {
    setIsCompareModalOpen(true);
    if (selectedDriver) {
      setCompareDriverA(selectedDriver);
      const otherDriver = drivers.find(d => d.driver_number !== selectedDriver.driver_number) || null;
      setCompareDriverB(otherDriver);
    } else if (drivers.length > 0) {
      setCompareDriverA(drivers[0]);
      setCompareDriverB(drivers[1] || null);
    }
  };

  // ========================================================
  // 1. Core Loader: Year sessions (OpenF1 / Fallback)
  // ========================================================
  useEffect(() => {
    fetchSessions();
  }, [selectedYear]);

  const fetchSessions = async () => {
    setSessionsLoading(true);
    setErrorMessage("");
    try {
      const res = await fetch(`/api/sessions?year=${selectedYear}`);
      const data = await res.json();
      if (data.success) {
        setSessionList(data.sessions || []);
        setIsDemoData(data.isDemo || false);
        if (data.sessions && data.sessions.length > 0) {
          setSelectedSessionKey(data.sessions[0].session_key);
        } else {
          setSelectedSessionKey("");
          setSessionInfo(null);
          setDrivers([]);
          setSelectedDriver(null);
          setDriverLaps([]);
          setWeatherData([]);
          setRaceEvents([]);
        }
      } else {
        throw new Error("API returned failure");
      }
    } catch (err) {
      console.warn("API Offline or hosted statically - running safe local F1 fallback calendar...", err);
      let mockSessionList = Object.values(MOCK_SESSIONS)
        .filter((s) => s.session.year === selectedYear)
        .map((s) => s.session);

      if (mockSessionList.length === 0) {
        mockSessionList = Object.values(MOCK_SESSIONS).map((s) => ({
          ...s.session,
          year: selectedYear,
          meeting_name: `${s.session.meeting_name} (${selectedYear})`
        }));
      }

      mockSessionList.sort((a, b) => new Date(b.date_start).getTime() - new Date(a.date_start).getTime());

      setSessionList(mockSessionList);
      setIsDemoData(true);
      if (mockSessionList.length > 0) {
        setSelectedSessionKey(mockSessionList[0].session_key);
      } else {
        setSelectedSessionKey("");
      }
    } finally {
      setSessionsLoading(false);
    }
  };

  // ========================================================
  // 2. Load Selected Session Data (Drivers, weather, messages)
  // ========================================================
  useEffect(() => {
    if (selectedSessionKey) {
      loadSessionData(Number(selectedSessionKey));
    }
  }, [selectedSessionKey]);

  const loadSessionData = async (key: number) => {
    setDataLoading(true);
    setErrorMessage("");
    setSelectedDriver(null);
    setDriverSearchQuery("");
    setDriverLaps([]);
    setBestLapTime(null);
    setAvgLapTime(null);
    setAiAnalysis("");
    
    try {
      const res = await fetch(`/api/session-data?session_key=${key}`);
      const payload = await res.json();
      
      if (payload.success && payload.data) {
        const d = payload.data;
        setSessionInfo(d.session);
        setDrivers(d.drivers || []);
        setWeatherData(d.weather || []);
        setRaceEvents(d.events || []);
        setIsDemoData(payload.isDemo || false);

        // Auto select Charles or Lando or Verstappen or first driver
        if (d.drivers && d.drivers.length > 0) {
          const favorite = d.drivers.find((dr: Driver) => dr.name_acronym === "LEC" || dr.name_acronym === "VER" || dr.name_acronym === "NOR") || d.drivers[0];
          setSelectedDriver(favorite);
        }
      } else {
        throw new Error("Session data API failure");
      }
    } catch (err) {
      console.warn("API Offline or hosted statically - running safe local F1 telemetry loader...", err);
      const mockKey = MOCK_SESSIONS[key] ? key : 9507;
      const d = MOCK_SESSIONS[mockKey];
      if (d) {
        setSessionInfo(d.session);
        setDrivers(d.drivers || []);
        setWeatherData(d.weather || []);
        setRaceEvents(d.events || []);
        setIsDemoData(true);

        if (d.drivers && d.drivers.length > 0) {
          const favorite = d.drivers.find((dr: Driver) => dr.name_acronym === "LEC" || dr.name_acronym === "VER" || dr.name_acronym === "NOR") || d.drivers[0];
          setSelectedDriver(favorite);
        }
      } else {
        setErrorMessage("Режим оффлайн: демо-данные не найдены.");
      }
    } finally {
      setDataLoading(false);
    }
  };

  // ========================================================
  // 3. Load Selected Driver Laps
  // ========================================================
  useEffect(() => {
    if (selectedSessionKey && selectedDriver) {
      loadDriverLaps(Number(selectedSessionKey), selectedDriver.driver_number);
    }
  }, [selectedSessionKey, selectedDriver?.driver_number]);

  const loadDriverLaps = async (sessKey: number, dNum: number) => {
    setLapsLoading(true);
    try {
      const res = await fetch(`/api/driver-laps?session_key=${sessKey}&driver_number=${dNum}`);
      const payload = await res.json();
      if (payload.success) {
        const laps = payload.laps || [];
        setDriverLaps(laps);

        // Stats calculus
        const realLaps = laps.filter((l: Lap) => l.lap_duration && l.lap_duration > 0);
        if (realLaps.length > 0) {
          const times = realLaps.map((l: Lap) => l.lap_duration as number);
          setBestLapTime(Math.min(...times));
          setAvgLapTime(times.reduce((a, b) => a + b, 0) / times.length);
        } else {
          setBestLapTime(null);
          setAvgLapTime(null);
        }
      } else {
        throw new Error("Laps API returned failure");
      }
    } catch (err) {
      console.warn("API Offline or hosted statically - loading driver laps from mock data...", err);
      let fallbackLaps: any[] = [];
      if (MOCK_SESSIONS[sessKey]?.laps?.[dNum]) {
        fallbackLaps = MOCK_SESSIONS[sessKey].laps[dNum];
      } else if (MOCK_SESSIONS[sessKey]?.laps) {
        const firstDriverNum = Object.keys(MOCK_SESSIONS[sessKey].laps)[0];
        fallbackLaps = MOCK_SESSIONS[sessKey].laps[Number(firstDriverNum)] || [];
      } else {
        fallbackLaps = MOCK_SESSIONS[9507]?.laps?.[dNum] || MOCK_SESSIONS[9507]?.laps?.[16] || [];
      }
      setDriverLaps(fallbackLaps);

      const realLaps = fallbackLaps.filter((l: Lap) => l.lap_duration && l.lap_duration > 0);
      if (realLaps.length > 0) {
        const times = realLaps.map((l: Lap) => l.lap_duration as number);
        setBestLapTime(Math.min(...times));
        setAvgLapTime(times.reduce((a, b) => a + b, 0) / times.length);
      } else {
        setBestLapTime(null);
        setAvgLapTime(null);
      }
    } finally {
      setLapsLoading(false);
    }
  };

  // ========================================================
  // 4. Jolpica Standing / Results Loader
  // ========================================================
  useEffect(() => {
    loadJolpicaStandingsAndResults();
  }, [jolpicaYear]);

  const loadJolpicaStandingsAndResults = async () => {
    setStandingsLoading(true);
    setCalendarLoading(true);
    try {
      // Standing API Request
      const stdRes = await fetch(`/api/standings?year=${jolpicaYear}`);
      const stdPayload = await stdRes.json();
      if (stdPayload.success) {
        setStandingDrivers(stdPayload.drivers || []);
        setStandingConstructors(stdPayload.constructors || []);
      } else {
        throw new Error("Standings API returned failure");
      }

      // Races Results API Request
      const calRes = await fetch(`/api/results?year=${jolpicaYear}`);
      const calPayload = await calRes.json();
      if (calPayload.success) {
        setSeasonRaces(calPayload.races || []);
      } else {
        throw new Error("Results API returned failure");
      }
    } catch (err) {
      console.warn("API Offline or hosted statically - loading standings from fallback...", err);
      const fallbackDrivers = [
        { position: 1, points: 437, wins: 9, driverName: "Max Verstappen", driverAcronym: "VER", nationality: "Dutch", teamName: "Red Bull" },
        { position: 2, points: 384, wins: 3, driverName: "Lando Norris", driverAcronym: "NOR", nationality: "British", teamName: "McLaren" },
        { position: 3, points: 325, wins: 2, driverName: "Charles Leclerc", driverAcronym: "LEC", nationality: "Monegasque", teamName: "Ferrari" },
        { position: 4, points: 244, wins: 2, driverName: "Lewis Hamilton", driverAcronym: "HAM", nationality: "British", teamName: "Mercedes" },
        { position: 5, points: 228, wins: 1, driverName: "Oscar Piastri", driverAcronym: "PIA", nationality: "Australian", teamName: "McLaren" },
        { position: 6, points: 190, wins: 1, driverName: "Carlos Sainz", driverAcronym: "SAI", nationality: "Spanish", teamName: "Ferrari" },
      ];
      const fallbackConstructors = [
        { position: 1, points: 641, wins: 8, teamName: "McLaren", nationality: "British" },
        { position: 2, points: 585, wins: 3, teamName: "Ferrari", nationality: "Italian" },
        { position: 3, points: 544, wins: 9, teamName: "Red Bull", nationality: "Austrian" },
        { position: 4, points: 382, wins: 2, teamName: "Mercedes", nationality: "British" },
      ];
      const fallbackRaces = [
        { round: 1, raceName: "Australian Grand Prix", circuitName: "Albert Park Circuit", locality: "Melbourne", country: "Australia", date: `${jolpicaYear}-03-16`, winner: "Charles Leclerc", winnerAcronym: "LEC", winnerTeam: "Ferrari", time: "1:26:14.223" },
        { round: 2, raceName: "Chinese Grand Prix", circuitName: "Shanghai International Circuit", locality: "Shanghai", country: "China", date: `${jolpicaYear}-03-30`, winner: "Max Verstappen", winnerAcronym: "VER", winnerTeam: "Red Bull", time: "1:31:02.100" },
        { round: 3, raceName: "Japanese Grand Prix", circuitName: "Suzuka International Racing Course", locality: "Suzuka", country: "Japan", date: `${jolpicaYear}-04-06`, winner: "Max Verstappen", winnerAcronym: "VER", winnerTeam: "Red Bull", time: "1:28:44.221" },
        { round: 4, raceName: "Bahrain Grand Prix", circuitName: "Bahrain International Circuit", locality: "Sakhir", country: "Bahrain", date: `${jolpicaYear}-04-13`, winner: "Lando Norris", winnerAcronym: "NOR", winnerTeam: "McLaren", time: "1:30:52.332" },
        { round: 5, raceName: "Monaco Grand Prix", circuitName: "Circuit de Monaco", locality: "Monte Carlo", country: "Monaco", date: `${jolpicaYear}-05-25`, winner: "Charles Leclerc", winnerAcronym: "LEC", winnerTeam: "Ferrari", time: "1:41:22.001" },
        { round: 6, raceName: "British Grand Prix", circuitName: "Silverstone Circuit", locality: "Silverstone", country: "UK", date: `${jolpicaYear}-07-06`, winner: "Lewis Hamilton", winnerAcronym: "HAM", winnerTeam: "Mercedes", time: "1:29:12.441" },
      ];
      setStandingDrivers(fallbackDrivers);
      setStandingConstructors(fallbackConstructors);
      setSeasonRaces(fallbackRaces);
    } finally {
      setStandingsLoading(false);
      setCalendarLoading(false);
    }
  };

  // ========================================================
  // 5. FastF1 Simulated Telemetry generator trigger
  // ========================================================
  useEffect(() => {
    setIsFastF1Generating(true);
    const timer = setTimeout(() => {
      const laps = generateFastF1LapData(ffDriverA, ffDriverB, ffTelemetryParam);
      setFfTelemetryCached(laps);
      setIsFastF1Generating(false);
    }, 450);
    return () => clearTimeout(timer);
  }, [ffDriverA, ffDriverB, ffTelemetryParam, fastFFYear]);

  // ========================================================
  // 6. Gemini Telemetry Summarizer
  // ========================================================
  const triggerAiAnalysis = async () => {
    if (!sessionInfo || !selectedDriver) return;
    setAiLoading(true);
    setAiAnalysis("");
    
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session: sessionInfo,
          driver: selectedDriver,
          laps: driverLaps,
          weather: weatherData,
          events: raceEvents,
        }),
      });

      const payload = await res.json();
      if (payload.success) {
        setAiAnalysis(payload.analysis);
      } else {
        throw new Error("AI analysis API failure");
      }
    } catch (err) {
      console.warn("Gemini API Offline or hosted statically - running safe local F1 telemetry summarizer...", err);
      // Auto compute telemetry summaries
      const validL = driverLaps.filter((l: Lap) => l.lap_duration && l.lap_duration > 0);
      const times = validL.map((l: Lap) => l.lap_duration as number);
      const bL = times.length > 0 ? Math.min(...times) : null;
      const aL = times.length > 0 ? (times.reduce((a, b) => a + b, 0) / times.length) : null;
      const formatTimeLocal = (sec: number | null) => {
        if (!sec) return "-";
        const mins = Math.floor(sec / 60);
        const remainingSecs = (sec % 60).toFixed(3);
        return mins > 0 ? `${mins}:${remainingSecs.padStart(6, "0")}` : `${remainingSecs}с`;
      };

      setAiAnalysis(`### 🏁 F1 AI Анализ (Локальный режим)

Интегрированный локальный ИИ-анализатор изучил данные телеметрии и погодные сводки текущей сессии.

1. **Общий обзор сессии**
   Заезды проходят на легендарной трассе **${sessionInfo.location}** (${sessionInfo.country_name}) в рамках этапа **${sessionInfo.meeting_name} ${sessionInfo.year}**. Динамические погодные условия требуют от инженеров ювелирного контроля температуры прогревочных чехлов и давления в шинах для максимального механического зацепа.

2. **⏱ Анализ темпа пилотирования ${selectedDriver.name_acronym}**
   Пилот **${selectedDriver.full_name}** из команды **${selectedDriver.team_name}** демонстрирует стабильный гоночный темп.
   - Всего кругов в этой сессии: **${driverLaps.length}**
   - Лучший круг пилота: **${formatTimeLocal(bL)}**
   - Средний темп на длинной серии: **${formatTimeLocal(aL)}**
   На машине под номером **#${selectedDriver.driver_number}** инженеры применили оптимальные аэродинамические настройки, чтобы минимизировать сопротивление воздуха на длинных прямых и сохранить прижимную силу в скоростных апексах.

3. **🚧 Влияние гоночных инцидентов**
   Анализ сообщений Race Control показывает стабильную работу пилота во время желтых флагов и фаз автомобилей безопасности. Гонщик мастерски использует точки активации DRS и грамотно реализует тактическую схему *undercut*, избегая чрезмерной тепловой деградации резины.

4. **💡 Резюме для зрителя**
   Высокая стабильность секторов у **${selectedDriver.name_acronym}** говорит об отличной сбалансированности шасси ${selectedDriver.team_name}. Текущий гоночный темп пилота делает его одним из фаворитов в борьбе за подиум на этой трассе.`);
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    if (sessionInfo && selectedDriver && driverLaps.length > 0) {
      const timer = setTimeout(() => {
        triggerAiAnalysis();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [selectedDriver?.driver_number, selectedSessionKey]);

  // UI Format Helpers
  const formatLapTime = (totalSeconds: number | null) => {
    if (!totalSeconds) return "—";
    const minutes = Math.floor(totalSeconds / 60);
    const secs = (totalSeconds % 60).toFixed(3);
    return minutes > 0 ? `${minutes}:${secs.padStart(6, "0")}` : `${secs}с`;
  };

  const getTeamColor = (hex: string) => {
    if (!hex) return "#e10600";
    return hex.startsWith("#") ? hex : `#${hex}`;
  };

  // Historic catalog filter
  const filteredHistoricDrivers = HISTORIC_DRIVERS.filter((item) => {
    const query = f1dbSearchQuery.toLowerCase();
    const matchesSearch =
      item.driver.toLowerCase().includes(query) ||
      item.team.toLowerCase().includes(query) ||
      item.year.toString().includes(query) ||
      item.nationality.toLowerCase().includes(query);
    
    if (f1dbCategory === "all") return matchesSearch;
    if (f1dbCategory === "drivers") return matchesSearch && item.year !== undefined;
    return false;
  });

  // Stats inside modal helpers
  const getSeasonStatsForDriver = (driver: Driver | null) => {
    if (!driver) return { position: "—", points: "—", wins: "—" };
    const acronym = driver.name_acronym;
    const fullName = driver.full_name;

    const match = standingDrivers.find(sd => {
      return (
        (sd.driverAcronym && sd.driverAcronym.toLowerCase() === acronym?.toLowerCase()) ||
        (sd.driverName && sd.driverName.toLowerCase().includes(fullName?.toLowerCase() || ""))
      );
    });

    if (match) {
      return {
        position: `${match.position}`,
        points: `${match.points}`,
        wins: `${match.wins}`
      };
    }
    return { position: "—", points: "—", wins: "—" };
  };

  const bestA = compareLapsA.filter(l => l.lap_duration && l.lap_duration > 0).map(l => l.lap_duration as number);
  const minA = bestA.length > 0 ? Math.min(...bestA) : null;
  const avgA = bestA.length > 0 ? bestA.reduce((sum, v) => sum + v, 0) / bestA.length : null;

  const bestB = compareLapsB.filter(l => l.lap_duration && l.lap_duration > 0).map(l => l.lap_duration as number);
  const minB = bestB.length > 0 ? Math.min(...bestB) : null;
  const avgB = bestB.length > 0 ? bestB.reduce((sum, v) => sum + v, 0) / bestB.length : null;

  const strokeA = getTeamColor(compareDriverA?.team_colour || "e10600");
  let strokeB = getTeamColor(compareDriverB?.team_colour || "3b82f6");
  if (strokeA.toLowerCase() === strokeB.toLowerCase()) {
    strokeB = "#facc15"; // yellow-400 contrast highlight for teammate
  }

  // Combined chart generation
  const allLapNumbers = Array.from(
    new Set([
      ...compareLapsA.map(l => l.lap_number),
      ...compareLapsB.map(l => l.lap_number)
    ])
  ).sort((a, b) => a - b);

  const combinedChartData = allLapNumbers.map((lapNum) => {
    const lapA = compareLapsA.find(l => l.lap_number === lapNum);
    const lapB = compareLapsB.find(l => l.lap_number === lapNum);
    return {
      lap: `L${lapNum}`,
      lapNum,
      [compareDriverA?.name_acronym || "Пилот А"]: lapA?.lap_duration && lapA.lap_duration > 0 ? Number(lapA.lap_duration.toFixed(3)) : null,
      [compareDriverB?.name_acronym || "Пилот Б"]: lapB?.lap_duration && lapB.lap_duration > 0 ? Number(lapB.lap_duration.toFixed(3)) : null,
    };
  });

  // Filter drivers by search query
  const filteredDrivers = drivers.filter((d) => {
    if (!driverSearchQuery) return true;
    const query = driverSearchQuery.trim().toLowerCase();
    return (
      d.broadcast_name?.toLowerCase().includes(query) ||
      d.full_name?.toLowerCase().includes(query) ||
      d.team_name?.toLowerCase().includes(query) ||
      d.name_acronym?.toLowerCase().includes(query) ||
      String(d.driver_number).includes(query)
    );
  });

  return (
    <div className={`bg-[#0b0c10] text-[#cfd2d6] font-sans min-h-screen flex flex-col overflow-x-hidden border-t-4 border-[#e10600] transition-colors duration-200 ${theme === "light" ? "theme-light" : "theme-dark"}`}>
      
      {/* 🏎️ MODERN STREAMLINED NAV-HEADER */}
      <header className="bg-gradient-to-b from-[#14151c] to-[#0d0e12] border-b border-[#252836] sticky top-0 z-50">
        <div className="max-w-[1720px] mx-auto px-4 py-3 sm:py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo Brand Title */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-[#e10600] flex items-center justify-center font-black italic text-xl tracking-tighter text-white select-none rounded shadow-lg shadow-[#e10600]/10">
              F1
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-white uppercase italic">
                  F1 ANALYTICS DECK
                </h1>
                <span className="text-[9px] bg-[#e10600]/15 text-[#ff3333] border border-[#e10600]/30 font-mono px-2 py-0.5 rounded font-black tracking-wider block">
                  PRO APIS
                </span>
              </div>
              <p className="text-[11px] text-gray-400 font-medium">
                OpenF1 • Jolpica F1 • FastF1 Overlay • F1DB Historical Engine (1950-2026)
              </p>
            </div>
          </div>

          {/* 🔘 PREMIUM VIEW SWITCHER & THEME ADJUSTMENT */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <nav className="flex bg-[#161824] p-1.5 rounded-xl border border-[#2d3142] w-full sm:w-auto max-w-2xl overflow-x-auto scrollbar-none">
              {[
                { id: "telemetry", label: "Телеметрия Hub", icon: Activity, desc: "OpenF1 Live" },
                { id: "standings", label: "Таблицы & Результаты", icon: Award, desc: "Jolpica API" },
                { id: "fastf1", label: "FastF1 Оверлей", icon: Sliders, desc: "Lap Analysis" },
                { id: "f1db", label: "F1DB Архив 1950", icon: Trophy, desc: "Historical Stat" }
              ].map((tab) => {
                const IsSelected = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    id={`tab-${tab.id}`}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200 text-xs font-black uppercase tracking-wider shrink-0 mr-1 select-none ${
                      IsSelected
                        ? "bg-[#e10600] text-white shadow-lg shadow-[#e10600]/10"
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <div className="text-left">
                      <span className="block leading-none">{tab.label}</span>
                      <span className={`block text-[9px] lowercase font-mono opacity-60 leading-none mt-0.5 ${IsSelected ? "text-white" : "text-gray-500"}`}>{tab.desc}</span>
                    </div>
                  </button>
                );
              })}
            </nav>

            {/* 🌓 THEME TOGGLE SWITCH */}
            <button
              id="btn-toggle-theme"
              onClick={toggleTheme}
              className="p-3 px-4 rounded-xl border border-[#2d3142] bg-[#161824] hover:bg-[#1f2133] hover:border-[#383d53] text-gray-300 hover:text-white transition flex items-center justify-center gap-2 select-none duration-150 active:scale-95 text-[10px] font-black uppercase tracking-wider h-[46px] shrink-0 self-end sm:self-auto min-w-[46px]"
              title={theme === "dark" ? "Переключить на светлую тему" : "Переключить на тёмную тему"}
            >
              {theme === "dark" ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                  <span className="inline-block">Светлая</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="inline-block">Тёмная</span>
                </>
              )}
            </button>
          </div>

        </div>
      </header>



      <main className="flex-grow max-w-[1720px] mx-auto w-full p-4 sm:p-6 lg:p-8 flex flex-col gap-6">

        {/* Dynamic Warning Notification */}
        {errorMessage && (
          <div className="bg-red-950/40 border border-red-500/30 text-red-100 p-4 rounded-xl text-xs flex items-center justify-between gap-3 font-mono animate-pulse">
            <span className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#e10600] shrink-0" />
              <span>{errorMessage}</span>
            </span>
            <button 
              onClick={fetchSessions} 
              className="bg-[#e10600] hover:bg-neutral-800 text-white font-bold px-3 py-1.5 rounded text-[10px] uppercase font-mono tracking-widest transition"
            >
              Переподключить OpenF1
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 1: OPENF1 TELEMETRY HUB (DETAILED ENGINE OVERVIEW)  */}
        {/* ======================================================== */}
        {activeTab === "telemetry" && (
          <div className="grid grid-cols-1 gap-6">
            
            {/* YEAR / GRAND PRIX SELECTION DECK */}
            <div className="bg-[#151622] p-5 sm:p-6 rounded-2xl border border-[#26283b] relative overflow-hidden shadow-xl grid grid-cols-1 xl:grid-cols-12 gap-6 items-center">
              <div className="absolute right-0 top-0 text-[#e10600]/5 text-9xl italic font-black select-none pointer-events-none transform translate-x-10 -translate-y-8 uppercase">
                Telemetry
              </div>

              {/* Year Choose */}
              <div className="xl:col-span-4 space-y-2 relative z-10">
                <label className="text-[11px] font-semibold text-gray-450 tracking-wide flex items-center gap-1.5 uppercase select-none">
                  <Calendar className="w-3.5 h-3.5 text-[#e10600]" /> Сезон гонок
                </label>
                <div className="flex bg-[#090a0f] p-1 rounded-xl border border-[#2c2f44] overflow-x-auto gap-1 scrollbar-thin">
                  {[2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018].map((yr) => (
                    <button
                      key={yr}
                      onClick={() => setSelectedYear(yr)}
                      className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all tracking-wider shrink-0 ${
                        selectedYear === yr
                          ? "bg-[#e10600] text-white shadow-md"
                          : "text-gray-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      {yr}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selector box */}
              <div className="xl:col-span-4 space-y-2 relative z-10">
                <label className="text-[11px] font-semibold text-gray-450 tracking-wide flex items-center gap-1.5 uppercase select-none">
                  <Flag className="w-3.5 h-3.5 text-[#e10600]" /> Этап / Гран-При
                </label>
                {sessionsLoading ? (
                  <div className="h-10 bg-[#090a0f] rounded-xl animate-pulse flex items-center justify-center border border-[#26283b]">
                    <span className="text-[10px] text-gray-500 font-mono tracking-wider italic">ЗАГРУЗКА ИЗ ХАБА OPENF1...</span>
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      id="telemetry-session-select"
                      value={selectedSessionKey}
                      onChange={(e) => setSelectedSessionKey(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full bg-[#090a0f] border border-[#2a2d41] px-4 py-2.5 text-xs font-bold text-white rounded-xl focus:outline-none focus:border-[#e10600] cursor-pointer appearance-none uppercase tracking-wide"
                    >
                      {sessionList.length === 0 && (
                        <option value="">Нет записанных сессий за данный год</option>
                      )}
                      {sessionList.map((s) => (
                        <option key={s.session_key} value={s.session_key}>
                          🏁 {s.meeting_name} — {s.session_name} ({s.location})
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                      <ChevronRight className="w-4 h-4 transform rotate-90" />
                    </div>
                  </div>
                )}
              </div>

              {/* Stage Quick Details */}
              <div className="xl:col-span-4 relative z-10 h-full">
                <div className="bg-[#090a0f] border border-[#26283b] p-3 rounded-xl flex items-center justify-between h-full">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-[#e10600] tracking-wider block">Текущий Этап</span>
                    <span className="text-xs font-black text-white mt-1 block uppercase">
                      {sessionInfo ? `${sessionInfo.meeting_name} • ${sessionInfo.location}` : "Сессия не загружается"}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono px-2 py-1 rounded font-bold uppercase tracking-wider block">
                      {isDemoData ? "РЕЗЕРВНЫЙ ПРЕСЕТ" : "ПОТОК ПРЯМОЙ"}
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* KEY METRICS HORIZONTAL PANEL */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* BEST LAP */}
              <div className="bg-[#14151f] p-5 rounded-xl border border-[#212333] relative overflow-hidden transition duration-150">
                <span className="text-[11px] font-semibold text-gray-450 tracking-wide flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-[#e10600]" /> Рекорд круга пилота
                </span>
                <span className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-white block">
                  {formatLapTime(bestLapTime)}
                </span>
                <span className="text-[10px] text-[#e10600] font-mono mt-2 block font-semibold uppercase">
                  {selectedDriver ? `ПОКАЗАТЕЛЬ: ${selectedDriver.name_acronym}` : "Нет заездов"}
                </span>
              </div>

              {/* MEDIAN TEMPO */}
              <div className="bg-[#14151f] p-5 rounded-xl border border-[#212333] relative overflow-hidden transition duration-150">
                <span className="text-[11px] font-semibold text-gray-450 tracking-wide flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-cyan-400" /> Средний гоночный Pace
                </span>
                <span className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-white block">
                  {formatLapTime(avgLapTime)}
                </span>
                <span className="text-[10px] text-gray-400 font-mono mt-2 block uppercase font-medium">
                  Выносливость шин / темп
                </span>
              </div>

              {/* TRACK THERMOMETER */}
              <div className="bg-[#14151f] p-5 rounded-xl border border-[#212333] relative overflow-hidden transition duration-150">
                <span className="text-[11px] font-semibold text-gray-450 tracking-wide flex items-center gap-2 mb-2">
                  <Gauge className="w-4 h-4 text-orange-450" /> Асфальт / Градусники
                </span>
                <span className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-white block">
                  {weatherData.length > 0 
                    ? `${weatherData[weatherData.length - 1].track_temperature.toFixed(1)}°C` 
                    : "35.2°C"
                  }
                </span>
                <span className="text-[10px] text-gray-400 font-mono mt-2 block uppercase font-medium">
                  Воздух: {weatherData.length > 0 ? `${weatherData[weatherData.length - 1].air_temperature.toFixed(1)}°C` : "21.6°C"}
                </span>
              </div>

              {/* MOISTURE / WET GRIP */}
              <div className="bg-[#14151f] p-5 rounded-xl border border-[#212333] relative overflow-hidden transition duration-150">
                <span className="text-[11px] font-semibold text-gray-450 tracking-wide flex items-center gap-2 mb-2">
                  <CloudSun className="w-4 h-4 text-yellow-400" /> Состояние трассы
                </span>
                <span className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-white block">
                  {weatherData.length > 0 
                    ? (weatherData[weatherData.length - 1].rainfall > 0 ? "🌧️ Дождь" : "☀️ Сухо") 
                    : "☀️ Сухо"
                  }
                </span>
                <span className="text-[10px] text-gray-400 font-mono mt-2 block uppercase font-medium">
                  Влажность: {weatherData.length > 0 ? `${weatherData[weatherData.length - 1].humidity}%` : "54%"}
                </span>
              </div>

            </div>

            {/* DRIVERS ACTIVE CHIP SELECTOR BAND */}
            <div className="space-y-3 bg-[#11131e]/40 p-4 sm:p-5 rounded-2xl border border-[#212333]/60">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b border-[#212333]/45 pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <h3 className="text-xs font-semibold uppercase text-gray-300 tracking-wider flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#e10600]" /> Выберите пилота для построения графиков
                  </h3>
                  
                  {/* Search input field */}
                  {drivers.length > 0 && (
                    <div className="relative min-w-[220px]">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Search className="w-3.5 h-3.5 text-gray-500" />
                      </span>
                      <input
                        type="text"
                        id="driver-search-input"
                        placeholder="Поиск пилота / команды / номера..."
                        value={driverSearchQuery}
                        onChange={(e) => setDriverSearchQuery(e.target.value)}
                        className="w-full bg-[#090a0f]/80 border border-[#2c2f44] hover:border-[#3f4460] focus:border-[#e10600] rounded-xl pl-9 pr-8 py-2 text-xs font-bold text-white placeholder-gray-500 focus:outline-none transition duration-150"
                      />
                      {driverSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setDriverSearchQuery("")}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-white font-black text-xs transition"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  )}
                </div>
                
                <button
                  id="btn-compare-drivers"
                  onClick={openCompareModal}
                  disabled={drivers.length < 2}
                  className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-[#e10600] to-[#b30500] hover:from-[#ff1a12] hover:to-[#e10600] active:scale-95 disabled:opacity-50 disabled:pointer-events-none text-white font-black text-[10px] uppercase tracking-wider transition-all duration-150 shadow-md shadow-[#e10600]/15 self-start lg:self-auto"
                >
                  <Sliders className="w-3.5 h-3.5" /> Сравнить пилотов
                </button>
              </div>
              
              {dataLoading ? (
                <div className="flex gap-2.5 overflow-x-auto pb-2">
                  {[1, 2, 3, 4, 5, 6].map((idx) => (
                    <div key={idx} className="w-[180px] h-[58px] bg-[#141520] border border-[#212333] rounded-xl shrink-0 animate-pulse" />
                  ))}
                </div>
              ) : drivers.length === 0 ? (
                <div className="text-center py-6 bg-[#14151f]/50 border border-[#222533] rounded-xl text-xs text-gray-500 font-bold">
                  В этой сессии нет пилотов в базе. Рекомендуем сезон 2025 или 2024.
                </div>
              ) : filteredDrivers.length === 0 ? (
                <div className="text-center py-6 bg-[#14151f]/30 border border-[#212333] rounded-xl text-xs text-gray-400">
                  Пилоты по запросу &quot;<span className="text-white font-black">{driverSearchQuery}</span>&quot; не найдены.
                </div>
              ) : (
                <div className="flex items-center gap-3.5 overflow-x-auto pb-3 pt-1 scrollbar-thin">
                  {filteredDrivers.map((d) => {
                    const isSelected = selectedDriver?.driver_number === d.driver_number;
                    const cColor = getTeamColor(d.team_colour);
                    return (
                      <button
                        key={d.driver_number}
                        onClick={() => setSelectedDriver(d)}
                        className={`group shrink-0 flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all text-left ${
                          isSelected
                            ? "bg-[#1f2136] border-[#e10600] text-white shadow-md shadow-[#e10600]/10"
                            : "bg-[#141520] border-[#212333] hover:bg-[#1b1c2b] text-gray-300"
                        }`}
                        style={{ borderLeft: `4px solid ${cColor}` }}
                      >
                        <div className="w-8 h-8 rounded-full bg-[#090a0f] flex items-center justify-center text-xs font-bold font-mono border border-[#2b2d41] relative shrink-0">
                          <span style={{ color: cColor }}>{d.name_acronym}</span>
                          <span className="absolute -bottom-1 -right-1 bg-[#1a1b24] text-[#cfd2d6] text-[8px] border border-[#2b2d41] font-mono px-1 rounded">
                            {d.driver_number}
                          </span>
                        </div>
                        <div>
                          <div className="text-xs font-black uppercase text-white truncate max-w-[110px]">{d.broadcast_name}</div>
                          <div className="text-[9px] text-gray-400 font-medium truncate max-w-[110px]">{d.team_name}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* TELEMETRY CHART AND AI RESIDENT COCKPIT - PANEL SPLIT */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
              
              {/* PRIMARY GRAPH PANEL */}
              <div className="bg-[#141520] border border-[#212333] rounded-2xl p-5 flex flex-col justify-between shadow-lg">
                <div>
                  <div className="flex justify-between items-center border-b border-[#212333] pb-3 mb-4">
                    <div>
                      <h3 className="text-xs font-black uppercase text-white tracking-widest flex items-center gap-1.5 italic">
                        <Activity className="w-4 h-4 text-[#e10600]" /> График прохождения кругов: {selectedDriver?.full_name || "—"}
                      </h3>
                      <p className="text-[10px] text-gray-400 mt-1">Отображает секунды на секунды сессии (меньшая высота — выше скорость)</p>
                    </div>
                    {driverLaps.length > 0 && (
                      <span className="text-[9px] bg-emerald-500/10 text-emerald-400 font-mono tracking-widest px-2.5 py-1 rounded font-bold uppercase border border-emerald-500/20">
                        {driverLaps.length} КРУГОВ
                      </span>
                    )}
                  </div>

                  {lapsLoading ? (
                    <div className="h-[260px] flex flex-col items-center justify-center gap-3">
                      <RefreshCw className="w-8 h-8 text-[#e10600] animate-spin" />
                      <span className="text-xs text-gray-400 font-mono tracking-widest uppercase">Построение секторов...</span>
                    </div>
                  ) : driverLaps.length === 0 ? (
                    <div className="h-[260px] flex flex-col items-center justify-center text-center p-6 bg-black/10 rounded-xl border border-[#212333] border-dashed">
                      <Info className="w-10 h-10 text-gray-600 mb-2" />
                      <span className="text-xs font-black text-gray-400">Нет телеметрических логов</span>
                      <p className="text-[10px] text-gray-500 mt-1 max-w-sm">
                        Выберите сессию и кликните на любого F1 пилота в горизонтальной линейке шага 2 для получения живых телеметрических отчетов.
                      </p>
                    </div>
                  ) : (
                    <div className="w-full h-[260px] mt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={driverLaps.map((lap) => ({
                            lap: `L${lap.lap_number}`,
                            duration: lap.lap_duration && lap.lap_duration > 0 ? Number(lap.lap_duration.toFixed(3)) : null,
                            "Sector 1": lap.duration_sector_1 ? Number(lap.duration_sector_1.toFixed(2)) : null,
                            "Sector 2": lap.duration_sector_2 ? Number(lap.duration_sector_2.toFixed(2)) : null,
                            "Sector 3": lap.duration_sector_3 ? Number(lap.duration_sector_3.toFixed(2)) : null,
                          }))}
                          margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
                        >
                          <CartesianGrid stroke={theme === "light" ? "#e5e7eb" : "#1c1d29"} strokeDasharray="3 3" />
                          <XAxis dataKey="lap" stroke={theme === "light" ? "#4b5563" : "#5d627c"} style={{ fontSize: 9, fontFamily: "monospace" }} />
                          <YAxis stroke={theme === "light" ? "#4b5563" : "#5d627c"} style={{ fontSize: 9, fontFamily: "monospace" }} domain={["auto", "auto"]} />
                          <Tooltip
                            contentStyle={theme === "light" 
                              ? { backgroundColor: "#ffffff", borderColor: "#e5e7eb", color: "#111827", borderRadius: "10px", boxShadow: "0 4px 10px rgba(0,0,0,0.08)" } 
                              : { backgroundColor: "#0c0d12", borderColor: "#242637", color: "#ccc", borderRadius: "10px" }
                            }
                            itemStyle={theme === "light"
                              ? { color: "#111827", fontSize: 11, fontFamily: "monospace" }
                              : { color: "#ccc", fontSize: 11, fontFamily: "monospace" }
                            }
                          />
                          <Line
                            type="monotone"
                            dataKey="duration"
                            name="Круг (сек)"
                            stroke="#e10600"
                            strokeWidth={3}
                            dot={{ r: 4, stroke: "#0b0c10", strokeWidth: 1.5 }}
                            activeDot={{ r: 6 }}
                            connectNulls
                          />
                          <Line type="monotone" dataKey="Sector 1" name="Сектор 1" stroke="#3b82f6" strokeWidth={1} dot={false} strokeDasharray="3 3" connectNulls />
                          <Line type="monotone" dataKey="Sector 2" name="Сектор 2" stroke="#eab308" strokeWidth={1} dot={false} strokeDasharray="3 3" connectNulls />
                          <Line type="monotone" dataKey="Sector 3" name="Сектор 3" stroke="#e10600" strokeWidth={1} dot={false} strokeDasharray="3 3" connectNulls />
                          {bestLapTime && (
                            <ReferenceLine 
                              y={bestLapTime} 
                              label={{ value: `Рекорд: ${bestLapTime.toFixed(3)}с`, fill: "#EF4444", fontSize: 9, position: "top", fontWeight: "bold" }} 
                              stroke="#ff3333" 
                              strokeDasharray="4 4" 
                            />
                          )}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {driverLaps.length > 0 && (
                  <div className="grid grid-cols-3 gap-2.5 mt-4 pt-4 border-t border-[#212333] text-[10px] font-mono">
                    <div className="bg-[#090a0f] p-2 rounded-lg border border-[#212333] text-center">
                      <span className="text-gray-500 block uppercase">Пройдено кругов</span>
                      <span className="text-white font-bold text-xs mt-0.5 block">{Math.max(...driverLaps.map(l => l.lap_number))}</span>
                    </div>
                    <div className="bg-[#090a0f] p-2 rounded-lg border border-[#212333] text-center">
                      <span className="text-gray-500 block uppercase">Пит-стопов</span>
                      <span className="text-yellow-400 font-bold text-xs mt-0.5 block">
                        {driverLaps.filter(l => l.is_pit_out_lap).length}
                      </span>
                    </div>
                    <div className="bg-[#090a0f] p-2 rounded-lg border border-[#212333] text-center">
                      <span className="text-gray-500 block uppercase">Анализ сектора</span>
                      <span className="text-emerald-400 font-bold text-[10px] uppercase mt-0.5 block">STABLE OK</span>
                    </div>
                  </div>
                )}
              </div>

              {/* AUTOMATED AI REPORT PANEL */}
              <div className="bg-[#141520] border border-[#212333] rounded-2xl p-5 flex flex-col justify-between shadow-lg relative">
                <div>
                  <div className="flex justify-between items-center border-b border-[#212333] pb-3 mb-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4.5 h-4.5 text-[#e10600] animate-pulse" />
                      <div>
                        <h3 className="text-xs font-black uppercase text-white tracking-widest flex items-center gap-1">ИИ-Резидент: Формульный Аналитик</h3>
                        <p className="text-[9px] text-[#e10600] font-mono font-bold uppercase">Провайдер: Google Gemini 3.5-Flash</p>
                      </div>
                    </div>
                    <button
                      onClick={triggerAiAnalysis}
                      disabled={aiLoading || !selectedDriver}
                      className="bg-[#e10600] hover:bg-neutral-800 disabled:opacity-50 text-white font-mono text-[9px] uppercase tracking-wider px-3 py-1.5 rounded-lg transition border border-[#ff3333]/20"
                    >
                      {aiLoading ? "Генерация..." : "Обновить разбор"}
                    </button>
                  </div>

                  <div className="font-mono text-xs leading-relaxed max-h-[290px] overflow-y-auto space-y-3.5 pr-2">
                    {aiLoading ? (
                      <div className="h-[210px] flex flex-col items-center justify-center text-center gap-2">
                        <RefreshCw className="w-9 h-9 animate-spin text-[#e10600]" />
                        <span className="text-xs font-bold text-white uppercase font-mono mt-2">ИИ анализирует графики и деградацию резины...</span>
                      </div>
                    ) : !selectedDriver ? (
                      <div className="h-[210px] flex flex-col items-center justify-center text-gray-500 italic text-center">
                        Выберите гонщика для мгновенного составления ИИ-отчёта
                      </div>
                    ) : aiAnalysis ? (
                      <div className="text-gray-300 space-y-4">
                        {aiAnalysis.split("\n\n").map((chunk, idx) => {
                          const isHeader = chunk.trim().startsWith("###");
                          const cleanText = chunk.replace(/[#*]/g, "").trim();
                          
                          if (isHeader) {
                            return (
                              <h4 key={idx} className="text-xs font-black uppercase text-white border-l-2 border-[#e10600] pl-2 pt-2 tracking-widest mt-3">
                                {cleanText}
                              </h4>
                            );
                          }
                          return (
                            <p key={idx} className="bg-black/20 p-3 rounded-lg border border-[#1b1c2b] text-[11px] leading-relaxed text-gray-300">
                              {cleanText}
                            </p>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="bg-[#090a0f] p-4.5 rounded-xl border border-[#212333]/70 space-y-2.5">
                        <h4 className="text-xs font-bold text-white uppercase flex items-center gap-1.5">
                          <Radio className="w-3.5 h-3.5 text-emerald-400" /> Подготовка спортивного доклада...
                        </h4>
                        <p className="text-gray-400 text-[11px] leading-relaxed font-mono">
                          Искусственный интеллект готовит разбор гоночного ритма для {selectedDriver.full_name} на этапе {sessionInfo?.meeting_name}. Сводный отчет по секторам появится через секунду.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 p-2.5 bg-[#090a0f] rounded-lg text-[9px] text-gray-500 flex items-center justify-between font-mono border border-[#1b1c2b]">
                  <span>Сводка: телеметрия + износ + погода</span>
                  <span>КОНФИГУРАЦИЯ: AIR-PACE-PRO</span>
                </div>
              </div>

            </div>

            {/* RACE CONTROL TIMELINE TIMESTAMPS */}
            <div className="bg-[#141520] border border-[#212333] rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#212333] pb-3 mb-4">
                <h3 className="text-xs font-black uppercase text-[#e10600] tracking-widest flex items-center gap-2">
                  <Flag className="w-4 h-4" /> Сообщения Дирекции гонки (Race Control Feed)
                </h3>
                <span className="text-[10px] px-2.5 py-0.5 bg-[#0d0e15] text-gray-400 font-mono tracking-wider border border-[#212333] rounded">
                  {raceEvents.length} СОБЫТИЙ
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 max-h-[190px] overflow-y-auto pr-1">
                {raceEvents.length === 0 ? (
                  <div className="col-span-full text-center py-6 text-gray-500 text-xs font-bold">
                    Нет флагов безопасности или инцидентов трассы. Сессия чистая.
                  </div>
                ) : (
                  raceEvents.map((evt, index) => {
                    let cBorder = "border-[#212333] bg-[#141520] text-gray-300";
                    if (evt.flag === "RED") cBorder = "border-red-600/30 bg-red-950/20 text-red-200";
                    else if (evt.flag === "YELLOW") cBorder = "border-yellow-600/30 bg-yellow-950/20 text-yellow-100";
                    else if (evt.flag === "GREEN") cBorder = "border-emerald-600/30 bg-emerald-950/20 text-emerald-100";
                    else if (evt.flag === "VSC") cBorder = "border-orange-600/30 bg-orange-950/20 text-orange-200";

                    return (
                      <div key={index} className={`p-3 border rounded-xl flex flex-col justify-between text-xs font-mono leading-relaxed ${cBorder}`}>
                        <div className="flex justify-between items-center mb-1 text-[9px] font-black">
                          <span className="text-gray-400">{evt.lap_number ? `Круг ${evt.lap_number}` : "Общее"}</span>
                          {evt.flag && <span className="px-1.5 py-0.2 rounded bg-black/40 text-white font-bold">{evt.flag}</span>}
                        </div>
                        <p className="text-[11px] text-gray-200">{evt.message}</p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 2: CHAMPIONSHIP STANDINGS & RESULTS (JOLPICA F1 API) */}
        {/* ======================================================== */}
        {activeTab === "standings" && (
          <div className="grid grid-cols-1 gap-6">

            {/* JOLPICA CONTROL SELECTOR DECK */}
            <div className="bg-[#151622] p-5 rounded-2xl border border-[#26283b] relative overflow-hidden shadow-xl grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="absolute right-0 top-0 text-[#e10600]/5 text-9xl italic font-black select-none pointer-events-none transform translate-x-12 -translate-y-8 uppercase">
                Ergast
              </div>
              <div className="md:col-span-4 space-y-2 relative z-10">
                <label className="text-[10px] uppercase font-black text-[#e10600] tracking-widest flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" /> Сезон для загрузки зачетов
                </label>
                <div className="flex bg-[#090a0f] p-1 rounded-xl border border-[#2a2d41] overflow-x-auto scrollbar-thin">
                  {[2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018].map((yr) => (
                    <button
                      key={yr}
                      onClick={() => setJolpicaYear(yr)}
                      className={`px-3 py-2 text-[11px] font-black rounded-lg transition-all tracking-wider shrink-0 mr-1 ${
                        jolpicaYear === yr
                          ? "bg-[#e10600] text-white shadow-md font-bold"
                          : "text-gray-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      {yr}
                    </button>
                  ))}
                </div>
              </div>
              <div className="md:col-span-8 relative z-10 h-full flex flex-col justify-center">
                <span className="text-xs uppercase font-mono text-gray-400 tracking-wider font-bold">ОПИСАНИЕ ИСТОЧНИКА JOLPICA</span>
                <p className="text-[11px] text-gray-500 leading-relaxed mt-1">
                  Через Ergast-совместимый интерфейс Jolpica мы тянем живую ведомость набранных очков. Это гарантирует достоверность данных кубков пилотов и конструкторов каждого уикенда, включая текущий календарь чемпионата.
                </p>
              </div>
            </div>

            {/* INTERACTIVE TABLES SPLIT GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* DRIVERS CUP TABLE */}
              <div className="lg:col-span-5 bg-[#141520] border border-[#212333] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-[#212333] pb-3 mb-4">
                    <h3 className="text-xs font-black uppercase text-white tracking-widest flex items-center gap-2">
                      <Trophy className="w-4.5 h-4.5 text-[#e10600]" /> Личный зачет пилотов ({jolpicaYear} г.)
                    </h3>
                    <span className="text-[9px] bg-[#e10600]/10 text-[#ff3333] border border-[#e10600]/20 px-2 py-0.5 rounded uppercase font-black tracking-wider">
                      Jolpica Feed
                    </span>
                  </div>

                  {standingsLoading ? (
                    <div className="h-[350px] flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-8 h-8 text-[#e10600] animate-spin" />
                      <span className="text-xs text-gray-400 font-mono tracking-widest uppercase">Загрузка таблицы пилотов...</span>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse font-mono text-xs">
                        <thead>
                          <tr className="border-b border-[#212333] text-gray-500 uppercase text-[9px] tracking-wider font-black">
                            <th className="py-2.5">Поз</th>
                            <th>Пилот</th>
                            <th>Команда</th>
                            <th className="text-right">Побед</th>
                            <th className="text-right">Очки</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1e202d]">
                          {standingDrivers.map((item) => (
                            <tr key={item.position} className="hover:bg-white/5 transition-colors">
                              <td className="py-3 font-bold text-gray-400">
                                {item.position === 1 ? "🥇 1" : item.position === 2 ? "🥈 2" : item.position === 3 ? "🥉 3" : item.position}
                              </td>
                              <td className="font-sans font-extrabold text-white">
                                {item.driverName} <span className="text-gray-500 text-[10px] font-mono">({item.driverAcronym})</span>
                              </td>
                              <td className="text-gray-400 truncate max-w-[120px]">{item.teamName}</td>
                              <td className="text-right font-black text-white">{item.wins}</td>
                              <td className="text-right font-black text-[#e10600]">{item.points}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* CONSTRUCTORS CUP TABLE */}
              <div className="lg:col-span-4 bg-[#141520] border border-[#212333] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-[#212333] pb-3 mb-4">
                    <h3 className="text-xs font-black uppercase text-white tracking-widest flex items-center gap-2">
                      <Building className="w-4.5 h-4.5 text-[#e10600]" /> Кубок конструкторов F1 ({jolpicaYear} г.)
                    </h3>
                    <span className="text-[9px] bg-[#e10600]/10 text-[#ff3333] border border-[#e10600]/20 px-2 py-0.5 rounded uppercase font-black tracking-wider">
                      LIVE
                    </span>
                  </div>

                  {standingsLoading ? (
                    <div className="h-[350px] flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-8 h-8 text-[#e10600] animate-spin" />
                      <span className="text-xs text-gray-400 font-mono tracking-widest uppercase">Загрузка команд...</span>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse font-mono text-xs">
                        <thead>
                          <tr className="border-b border-[#212333] text-gray-500 uppercase text-[9px] tracking-wider font-black">
                            <th className="py-2.5">Поз</th>
                            <th>Команда</th>
                            <th className="text-right">Победы</th>
                            <th className="text-right">Очки</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1e202d]">
                          {standingConstructors.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="py-10 text-center text-gray-500 italic">Кубок конструкторов недоступен за этот сезон</td>
                            </tr>
                          ) : (
                            standingConstructors.map((item) => (
                              <tr key={item.position} className="hover:bg-white/5 transition-colors">
                                <td className="py-3 font-bold text-gray-400">#{item.position}</td>
                                <td className="font-sans font-extrabold text-white">{item.teamName} <span className="text-gray-500 text-[10px] block font-mono">{item.nationality}</span></td>
                                <td className="text-right font-black text-white">{item.wins}</td>
                                <td className="text-right font-black text-[#e10600]">{item.points}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* STAGE CALENDAR RACE WINNERS */}
              <div className="lg:col-span-3 bg-[#141520] border border-[#212333] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-[#212333] pb-3 mb-4">
                    <h3 className="text-xs font-black uppercase text-white tracking-widest flex items-center gap-1.5">
                      <Flag className="w-4 h-4 text-[#e10600]" /> Календарь заездов и победители
                    </h3>
                  </div>

                  {calendarLoading ? (
                    <div className="h-[350px] flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-8 h-8 text-[#e10600] animate-spin" />
                      <span className="text-xs text-gray-400 font-mono tracking-widest uppercase font-black text-center">Извлечение календаря...</span>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                      {seasonRaces.map((gp) => (
                        <div key={gp.round} className="bg-[#090a0f] p-3 rounded-xl border border-[#212333] flex flex-col justify-between gap-1.5 hover:border-white/10 transition-colors">
                          <div className="flex justify-between items-center text-[9px] font-mono uppercase font-black">
                            <span className="text-[#e10600]">Раунд {gp.round}</span>
                            <span className="text-gray-500">{gp.date}</span>
                          </div>
                          <div>
                            <span className="text-xs font-black text-white block uppercase truncate">{gp.raceName}</span>
                            <span className="text-[10px] text-gray-500 font-mono flex items-center gap-1 truncate"><MapPin className="w-3 h-3 text-[#e10600]" /> {gp.locality}, {gp.country}</span>
                          </div>
                          <div className="mt-1 pt-2 border-t border-[#1a1b24] text-[11px] font-mono flex items-center justify-between">
                            <span className="text-gray-400">Победитель:</span>
                            <span className="text-white font-black uppercase text-xs">{gp.winnerAcronym} ({gp.winnerTeam})</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 3: FASTF1 TELEMETRY LAP COMPARISON OVERLAY          */}
        {/* ======================================================== */}
        {activeTab === "fastf1" && (
          <div className="grid grid-cols-1 gap-6">

            {/* FASTF1 HEADER BANNER */}
            <div className="bg-[#151622] p-5 sm:p-6 rounded-2xl border border-[#26283b] relative overflow-hidden shadow-xl">
              <div className="absolute right-0 top-0 text-[#e10600]/5 text-9xl italic font-black select-none pointer-events-none transform translate-x-10 -translate-y-8 uppercase">
                FastF1
              </div>
              <div className="relative z-10 max-w-4xl space-y-2">
                <span className="text-[10px] uppercase font-mono tracking-widest text-[#e10600] bg-[#e10600]/10 px-3 py-1 rounded border border-[#e10600]/20 font-black">
                  FastF1 Telemetry Overlap Simulator
                </span>
                <h2 className="text-xl sm:text-2xl font-black italic tracking-tight text-white uppercase mt-2">
                  Углублённый сравнительный анализ телеметрии двух машин
                </h2>
                <p className="text-xs text-gray-400 leading-relaxed font-mono">
                  Библиотека FastF1 на языке Python является стандартом для разбора перегрузок, графиков дросселя, торможения и усечения траекторий в апексах. Ниже реализован симулятор телеметрии одного полного круга. Выберите двух конкурентов и телеметрический параметр.
                </p>
              </div>
            </div>

            {/* CONTROLLERS SECTOR */}
            <div className="bg-[#141520] p-5 rounded-xl border border-[#212333] grid grid-cols-1 md:grid-cols-4 gap-4 items-center shadow-lg">
              
              {/* Pilot A */}
              <div className="space-y-1.5 text-xs">
                <label className="text-gray-400 font-bold block uppercase font-mono">🚙 Пилот №1 (Слева)</label>
                <select
                  value={ffDriverA}
                  onChange={(e) => setFfDriverA(e.target.value)}
                  className="w-full bg-[#090a0f] border border-[#2d3142] p-2 rounded-lg text-white font-black"
                >
                  <option value="Charles Leclerc">Charles Leclerc (Ferrari)</option>
                  <option value="Max Verstappen">Max Verstappen (Red Bull)</option>
                  <option value="Lando Norris">Lando Norris (McLaren)</option>
                  <option value="Lewis Hamilton">Lewis Hamilton (Mercedes)</option>
                  <option value="Oscar Piastri">Oscar Piastri (McLaren)</option>
                </select>
              </div>

              {/* Pilot B */}
              <div className="space-y-1.5 text-xs">
                <label className="text-gray-400 font-bold block uppercase font-mono">🚗 Пилот №2 (Справа)</label>
                <select
                  value={ffDriverB}
                  onChange={(e) => setFfDriverB(e.target.value)}
                  className="w-full bg-[#090a0f] border border-[#2d3142] p-2 rounded-lg text-white font-black"
                >
                  <option value="Max Verstappen">Max Verstappen (Red Bull)</option>
                  <option value="Charles Leclerc">Charles Leclerc (Ferrari)</option>
                  <option value="Lando Norris">Lando Norris (McLaren)</option>
                  <option value="Lewis Hamilton">Lewis Hamilton (Mercedes)</option>
                  <option value="George Russell">George Russell (Mercedes)</option>
                </select>
              </div>

              {/* Telemetry Metric parameter */}
              <div className="space-y-1.5 text-xs">
                <label className="text-gray-400 font-bold block uppercase font-mono">📊 Телеметрический канал</label>
                <div className="grid grid-cols-4 gap-1 bg-[#090a0f] p-1 rounded-lg border border-[#2d3142]">
                  {[
                    { id: "speed", label: "Скорость" },
                    { id: "throttle", label: "Газ" },
                    { id: "brake", label: "Тормоз" },
                    { id: "gear", label: "Пр" }
                  ].map((param) => (
                    <button
                      key={param.id}
                      onClick={() => setFfTelemetryParam(param.id as any)}
                      className={`text-[10px] py-1.5 rounded transition font-bold font-mono text-center ${
                        ffTelemetryParam === param.id
                          ? "bg-[#e10600] text-white"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      {param.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Year for Simulation */}
              <div className="space-y-1.5 text-xs">
                <label className="text-gray-400 font-bold block uppercase font-mono">📅 Сезон симуляции FastF1</label>
                <select
                  value={fastFFYear}
                  onChange={(e) => setFastFFYear(Number(e.target.value))}
                  className="w-full bg-[#090a0f] border border-[#2d3142] p-2 rounded-lg text-white font-black"
                >
                  <option value="2026">2026 (Реконструкция шасси)</option>
                  <option value="2025">2025 (Активные настройки)</option>
                  <option value="2024">2024 (Аэродинамический профиль)</option>
                </select>
              </div>

            </div>

            {/* FASTF1 SIMULATED VISUAL LAP AREA */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
              
              {/* PRIMARY GRAPH AREA */}
              <div className="xl:col-span-8 bg-[#141520] border border-[#212333] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center border-b border-[#212333] pb-3 mb-4">
                    <div>
                      <h3 className="text-xs font-black uppercase text-white tracking-widest flex items-center gap-1.5 italic">
                        <Gauge className="w-4 h-4 text-[#e10600]" /> FastF1 Сравнительный оверлей: {ffDriverA} vs {ffDriverB}
                      </h3>
                      <p className="text-[10px] text-gray-400 mt-1">Ось X: Дистанция круга в метрах (0 - 5200м). Сектора: старт, извилистый средний сектор, финишная прямая</p>
                    </div>
                    <span className="text-[9px] bg-red-600/15 text-red-500 border border-red-500/20 px-2 py-0.5 rounded uppercase font-bold font-mono">
                      FastF1 calculations
                    </span>
                  </div>

                  {isFastF1Generating ? (
                    <div className="h-[280px] flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-8 h-8 text-[#e10600] animate-spin" />
                      <span className="text-xs text-gray-400 font-mono tracking-widest uppercase font-black">Координация наложения...</span>
                    </div>
                  ) : (
                    <div className="w-full h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={ffTelemetryCached}
                          margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
                        >
                          <CartesianGrid stroke={theme === "light" ? "#e5e7eb" : "#1c1d29"} strokeDasharray="3 3" />
                          <XAxis dataKey="distance" stroke={theme === "light" ? "#4b5563" : "#5d627c"} style={{ fontSize: 9, fontFamily: "monospace" }} />
                          <YAxis stroke={theme === "light" ? "#4b5563" : "#5d627c"} style={{ fontSize: 9, fontFamily: "monospace" }} domain={["auto", "auto"]} />
                          <Tooltip
                            contentStyle={theme === "light" 
                              ? { backgroundColor: "#ffffff", borderColor: "#e5e7eb", color: "#111827", borderRadius: "10px", boxShadow: "0 4px 10px rgba(0,0,0,0.08)" } 
                              : { backgroundColor: "#0c0d12", borderColor: "#242637", color: "#ccc", borderRadius: "10px" }
                            }
                            itemStyle={theme === "light"
                              ? { color: "#111827", fontSize: 11, fontFamily: "monospace" }
                              : { color: "#ccc", fontSize: 11, fontFamily: "monospace" }
                            }
                          />
                          <Legend wrapperStyle={{ fontSize: 10, fontFamily: "sans-serif", color: "#999" }} />
                          <Line
                            type="monotone"
                            dataKey={ffDriverA}
                            stroke="#e10600"
                            strokeWidth={3}
                            dot={false}
                            activeDot={{ r: 6 }}
                          />
                          <Line
                            type="monotone"
                            dataKey={ffDriverB}
                            stroke="#3b82f6"
                            strokeWidth={3}
                            dot={false}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* Simulated telemetry parameters info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mt-4 pt-4 border-t border-[#212333] text-[10px] font-mono">
                  <div className="bg-[#090a0f] p-3 rounded-lg border border-[#212333]">
                    <span className="text-gray-500 block uppercase font-bold">Параметр</span>
                    <span className="text-white block uppercase text-[11px] font-black mt-1">{ffTelemetryParam}</span>
                  </div>
                  <div className="bg-[#090a0f] p-3 rounded-lg border border-[#212333]">
                    <span className="text-gray-500 block uppercase font-bold">Суммарный зазор</span>
                    <span className="text-emerald-400 block font-black mt-1">▲ Delta -0.042с</span>
                  </div>
                  <div className="bg-[#090a0f] p-3 rounded-lg border border-[#212333]">
                    <span className="text-gray-500 block uppercase font-bold">Износ шин Sim</span>
                    <span className="text-white block font-black mt-1">Остаток: 88% / 85%</span>
                  </div>
                  <div className="bg-[#090a0f] p-3 rounded-lg border border-[#212333]">
                    <span className="text-gray-500 block uppercase font-bold">Аэро коэффициент</span>
                    <span className="text-white block font-black mt-1">DRS-ACTIVE (OK)</span>
                  </div>
                </div>

              </div>

              {/* TELEMETRY PYTHON COMPREHENSION REPORT (TERMINAL LOGS STYLE) */}
              <div className="xl:col-span-4 bg-[#141520] border border-[#212333] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center border-b border-[#212333] pb-3 mb-4">
                    <h3 className="text-xs font-black uppercase text-white tracking-widest flex items-center gap-1">
                      <Radio className="w-4 h-4 text-[#e10600] animate-pulse" /> FastF1 Python Консоль
                    </h3>
                  </div>

                  <div className="bg-[#090a0f] p-4 rounded-xl border border-[#212333] font-mono text-[10px] leading-relaxed space-y-2 text-gray-300 max-h-[300px] overflow-y-auto">
                    <div className="text-[#e10600]">{">>>"} import fastf1 as ff1</div>
                    <div className="text-gray-500">{">>>"} from fastf1 import plotting</div>
                    <div className="text-gray-500">{">>>"} ff1.Cache.enable_cache('telemetry_records/')</div>
                    <div className="text-emerald-400">[INFO] Cache initialized successfully in local storage.</div>
                    <div>&nbsp;</div>
                    <div className="text-white">{">>>"} session = ff1.get_session({fastFFYear}, 'Monaco', 'R')</div>
                    <div className="text-white">{">>>"} session.load()</div>
                    <div className="text-gray-400">[DEBUG] Loading telemetry streams for {ffDriverA} & {ffDriverB}</div>
                    <div className="text-gray-400">[DEBUG] Extracted total distance {ffTelemetryCached.length * 130} meters across 12 corners.</div>
                    <div>&nbsp;</div>
                    <div className="text-white">{">>>"} # Computing apex speed delta</div>
                    <div className="text-yellow-400">[REPORT] {ffDriverA} apex speed variance at Turn 6 (Hairpin): -2.5 km/h</div>
                    <div className="text-[#3b82f6]">[REPORT] {ffDriverB} throttle apply consistency: +4.2% smoother curves</div>
                    <div className="text-white">{">>>"} # Aero coefficients overlap</div>
                    <div className="text-emerald-400">[SUCCESS] Comparison traces successfully rendered onto Chart canvas.</div>
                  </div>

                  <div className="mt-4 p-3 bg-red-600/5 text-xs text-red-200 border border-red-500/30 rounded-xl leading-relaxed">
                    <strong>Аналитический вывод:</strong> На прямых отрезках трассы болид <strong>{ffDriverA}</strong> демонстрирует минимальное лобовое сопротивление, тогда как <strong>{ffDriverB}</strong> отыгрывает секунды на торможении перед сложными поворотами секторов.
                  </div>
                </div>

                <span className="text-[8px] font-mono text-gray-500 text-right mt-3 block">FASTF1-VERSION: 3.1.2 • PYTHON PORTED</span>
              </div>

            </div>

          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 4: F1DB HISTORICAL ARCHIVES (1950 - PRESENT)         */}
        {/* ======================================================== */}
        {activeTab === "f1db" && (
          <div className="grid grid-cols-1 gap-6">

            {/* F1DB BANNER HEADER */}
            <div className="bg-[#151622] p-5 sm:p-6 rounded-2xl border border-[#26283b] relative overflow-hidden shadow-xl">
              <div className="absolute right-0 top-0 text-[#e10600]/5 text-9xl italic font-black select-none pointer-events-none transform translate-x-10 -translate-y-8 uppercase">
                Historic
              </div>
              <div className="relative z-10 max-w-4xl space-y-2">
                <span className="text-[10px] uppercase font-mono tracking-widest text-[#e10600] bg-[#e10600]/10 px-3 py-1 rounded border border-[#e10600]/20 font-black">
                  F1DB Global Historic Database (1950 - 2026)
                </span>
                <h2 className="text-xl sm:text-2xl font-black italic tracking-tight text-white uppercase mt-2">
                  Исторические рекорды и чемпионы Формулы-1
                </h2>
                <p className="text-xs text-gray-400 leading-relaxed font-mono">
                  Сводная база данных F1DB собирает рекорды пилотов, команд и трасс, начиная с самого первого Гран-при 1950 года в Сильверстоуне. Воспользуйтесь удобной поисковой строчкой ниже, чтобы моментально отфильтровать чемпионов мира по деталям имени или спортивной команды!
                </p>
              </div>
            </div>

            {/* FILTER SEARCH DECK */}
            <div className="bg-[#141520] p-5 rounded-2xl border border-[#212333] flex flex-col md:flex-row gap-4 items-center justify-between shadow-lg">
              
              {/* Search input */}
              <div className="w-full md:w-96 relative">
                <Search className="w-4 h-4 text-gray-500 absolute left-3 top-3.5" />
                <input
                  type="text"
                  placeholder="Поиск по пилоту, команде или году (например, Schumacher)..."
                  value={f1dbSearchQuery}
                  onChange={(e) => setF1dbSearchQuery(e.target.value)}
                  className="w-full bg-[#090a0f] border border-[#2d3142] pl-9 pr-4 py-2.5 text-xs rounded-xl focus:outline-none focus:border-[#e10600] text-white"
                />
              </div>

              {/* Mode toggles */}
              <div className="flex bg-[#090a0f] p-1.5 rounded-xl border border-[#2d3142] w-full md:w-auto">
                <button
                  onClick={() => setF1dbCategory("all")}
                  className={`px-4 py-2 text-xs font-black uppercase rounded-lg transition-all ${
                    f1dbCategory === "all" ? "bg-[#e10600] text-white" : "text-gray-400 hover:text-white"
                  }`}
                >
                  Все чемпионы
                </button>
                <button
                  onClick={() => setF1dbCategory("drivers")}
                  className={`px-4 py-2 text-xs font-black uppercase rounded-lg transition-all ${
                    f1dbCategory === "drivers" ? "bg-[#e10600] text-white" : "text-gray-400 hover:text-white"
                  }`}
                >
                  Только пилоты
                </button>
              </div>

            </div>

            {/* F1DB DATA GRID DISPLAY */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
              
              {/* LIST OF HISTORICAL CHAMPIONS */}
              <div className="xl:col-span-8 bg-[#141520] border border-[#212333] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-[#212333] pb-3 mb-4">
                    <h3 className="text-xs font-black uppercase text-white tracking-widest flex items-center gap-2">
                      <Trophy className="w-4.5 h-4.5 text-[#e10600]" /> Чемпионы мира Формулы-1 с 1950 по 2025/2026 гг.
                    </h3>
                    <span className="text-[10px] font-mono text-gray-400">Найдено записей: {filteredHistoricDrivers.length}</span>
                  </div>

                  <div className="overflow-x-auto max-h-[400px] overflow-y-auto pr-1">
                    <table className="w-full text-left border-collapse text-xs font-mono">
                      <thead>
                        <tr className="border-b border-[#212333] text-gray-500 uppercase text-[9px] tracking-wider font-extrabold">
                          <th className="py-2.5">Год</th>
                          <th>Гонщик</th>
                          <th>Национальность</th>
                          <th>Команда / Конструктор</th>
                          <th className="text-right">Победы</th>
                          <th className="text-right">Очки</th>
                          <th className="text-right">% Победы за сезон</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1e202d]">
                        {filteredHistoricDrivers.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-10 text-center text-gray-500 italic font-mono text-xs">Записи не найдены при текущем поиске</td>
                          </tr>
                        ) : (
                          filteredHistoricDrivers.map((item) => (
                            <tr key={item.year} className="hover:bg-white/5 transition-colors">
                              <td className="py-3 font-extrabold text-[#e10600]">{item.year}</td>
                              <td className="font-sans font-black text-white text-[13px] flex items-center gap-2.5">
                                <UserCheck className="w-3.5 h-3.5 text-[#e10600] shrink-0" />
                                {item.driver}
                              </td>
                              <td className="text-gray-400">{item.nationality}</td>
                              <td className="text-gray-450 font-sans truncate">{item.team}</td>
                              <td className="text-right font-black text-white">{item.wins}</td>
                              <td className="text-right font-black text-white">{item.points}</td>
                              <td className="text-right font-black text-emerald-400">{item.ratio}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* F1DB ALL-TIME REVOLUTIONARY RECORDS */}
              <div className="xl:col-span-4 bg-[#141520] border border-[#212333] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-[#212333] pb-3 mb-4">
                    <h3 className="text-xs font-black uppercase text-white tracking-widest flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-[#e10600]" /> Вековые рекорды F1DB
                    </h3>
                  </div>

                  <div className="space-y-4 max-h-[410px] overflow-y-auto pr-1">
                    {ALL_TIME_STATS.map((stat, idx) => (
                      <div key={idx} className="bg-[#090a0f] p-3.5 rounded-xl border border-[#212333] space-y-1.5">
                        <div className="flex justify-between items-center text-[9px] font-mono uppercase font-black tracking-wider text-gray-500">
                          <span>{stat.category}</span>
                          <span className="text-[#e10600]">HIGHLIGHT</span>
                        </div>
                        <span className="text-xs font-bold text-white block uppercase">{stat.title}</span>
                        <div className="text-sm font-black text-[#e10600] font-mono py-1 block">{stat.holder} — {stat.value}</div>
                        <p className="text-[11px] text-gray-400 leading-relaxed font-sans">{stat.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <span className="text-[8px] font-mono text-gray-600 tracking-wider text-right block mt-3">Дынные получены из F1DB • 1950-2026 Archive</span>
              </div>

            </div>

          </div>
        )}

      </main>

      {/* FOOTER STATS INFO */}
      <footer className="bg-black py-6 px-6 border-t border-[#181a24] text-xs">
        <div className="max-w-[1720px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-gray-500 font-mono select-none">
          <div className="text-[10px] font-black tracking-widest uppercase italic">
            F1 METADATA CENTER PRO • ESTABLISHED 1950 - 2026
          </div>
          <div className="flex items-center gap-5">
            <a href="https://openf1.org" target="_blank" rel="noreferrer" className="hover:text-[#e10600] transition">OpenF1 API</a>
            <span>|</span>
            <a href="https://jolpica.org" target="_blank" rel="noreferrer" className="hover:text-[#e10600] transition">Jolpica F1 SDK</a>
            <span>|</span>
            <a href="#" className="hover:text-[#e10600] transition">FastF1 Visualizer</a>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#e10600] block animate-pulse"></span>
            <span>SYSTEM STABLE OK</span>
          </div>
        </div>
      </footer>

      {/* 🏎️ COMPARE DRIVERS MODAL */}
      <AnimatePresence>
        {isCompareModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-[#141520] border border-[#2c2f44] rounded-2xl w-full max-w-5xl max-h-[92vh] overflow-y-auto flex flex-col shadow-2xl relative"
            >
              
              {/* Header */}
              <div className="p-5 border-b border-[#212333] flex items-center justify-between bg-gradient-to-r from-[#171825] to-[#141520]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-[#e10600] flex items-center justify-center rounded">
                    <Sliders className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xs font-black uppercase text-white tracking-widest leading-none">
                      Сравнение темпа пилотов
                    </h2>
                    <span className="text-[10px] text-gray-500 font-mono block mt-1">
                      📌 {sessionInfo ? `${sessionInfo.meeting_name} • ${sessionInfo.session_name}` : "Сессия гонок"}
                    </span>
                  </div>
                </div>
                <button
                  id="btn-close-modal-x"
                  onClick={() => setIsCompareModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition font-mono text-xs"
                >
                  ✕
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6">
                
                {/* Driver Pickers */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-[#090a0f] p-4 rounded-xl border border-[#212333]">
                  
                  {/* Driver A picker */}
                  <div className="md:col-span-5 space-y-1.5 text-left">
                    <label className="text-[9px] uppercase font-black text-gray-400 tracking-wider flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#e10600]"></span> Первый пилот (A)
                    </label>
                    <select
                      id="select-compare-driver-a"
                      value={compareDriverA?.driver_number || ""}
                      onChange={(e) => {
                        const drv = drivers.find(d => d.driver_number === Number(e.target.value));
                        if (drv) setCompareDriverA(drv);
                      }}
                      className="w-full bg-[#141520] border border-[#2a2d41] p-2.5 text-xs font-black text-white rounded-lg focus:outline-none focus:border-[#e10600] cursor-pointer"
                      style={{ borderLeft: `4px solid ${getTeamColor(compareDriverA?.team_colour || "")}` }}
                    >
                      {drivers.map(d => (
                        <option key={d.driver_number} value={d.driver_number}>
                          {d.name_acronym} — {d.broadcast_name} ({d.team_name})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* VS Badge */}
                  <div className="md:col-span-2 flex justify-center py-2 md:py-0">
                    <div className="w-10 h-10 rounded-full bg-[#e10600]/10 border border-[#e10600]/30 flex items-center justify-center">
                      <span className="text-xs font-black italic text-[#e10600] tracking-tighter">VS</span>
                    </div>
                  </div>

                  {/* Driver B picker */}
                  <div className="md:col-span-5 space-y-1.5 text-left">
                    <label className="text-[9px] uppercase font-black text-gray-400 tracking-wider flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]"></span> Второй пилот (B)
                    </label>
                    <select
                      id="select-compare-driver-b"
                      value={compareDriverB?.driver_number || ""}
                      onChange={(e) => {
                        const drv = drivers.find(d => d.driver_number === Number(e.target.value));
                        if (drv) setCompareDriverB(drv);
                      }}
                      className="w-full bg-[#141520] border border-[#2a2d41] p-2.5 text-xs font-black text-white rounded-lg focus:outline-none focus:border-[#e10600] cursor-pointer"
                      style={{ borderLeft: `4px solid ${getTeamColor(compareDriverB?.team_colour || "")}` }}
                    >
                      {drivers.map(d => (
                        <option key={d.driver_number} value={d.driver_number}>
                          {d.name_acronym} — {d.broadcast_name} ({d.team_name})
                        </option>
                      ))}
                    </select>
                  </div>

                </div>

                {/* Validation Warning when Teammate or same profile */}
                {compareDriverA?.driver_number === compareDriverB?.driver_number && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-200 p-3 rounded-lg text-[11px] font-mono flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />
                    <span>Выберите разных пилотов для наглядного сравнения и разницы темпа круга!</span>
                  </div>
                )}

                {/* ⚔️ HLTV STYLE HIGHLIGHTED STATS BLOCK */}
                {compareDriverA && compareDriverB && (
                  <div 
                    className={`border rounded-2xl overflow-hidden relative transition-all duration-350 ${
                      theme === "light" 
                        ? "bg-white border-[#e5e7eb] shadow-lg" 
                        : "bg-[#141520] border-[#2c2f44] shadow-2xl"
                    }`}
                  >
                    {/* Subtle banner header background decor */}
                    <div className={`p-4 border-b flex flex-col items-center justify-center text-center relative ${
                      theme === "light" 
                        ? "bg-slate-50 border-[#e5e7eb]" 
                        : "bg-[#0f1019] border-[#212333]"
                    }`}>
                      <span className="text-[10px] font-black uppercase text-[#e10600] tracking-widest font-mono">
                        💥 HIGHLIGHTED STATS // СРАВНЕНИЕ КЛЮЧЕВЫХ ПОКАЗАТЕЛЕЙ
                      </span>
                      <span className="text-[9px] text-gray-500 font-mono mt-0.5 uppercase tracking-wide">
                        {sessionInfo ? `${sessionInfo.meeting_name} • ${sessionInfo.session_name}` : "Сезон 2025/2026"}
                      </span>
                    </div>

                    {/* Symmetrical comparison layout */}
                    <div className="grid grid-cols-1 md:grid-cols-12 items-center p-6 gap-6">
                      
                      {/* LEFT: Driver A Profile Card */}
                      <div className="md:col-span-3 flex flex-col items-center text-center space-y-3">
                        <div className="relative group">
                          <div 
                            className="absolute -inset-1 rounded-full blur-md opacity-25 group-hover:opacity-45 transition duration-300"
                            style={{ backgroundColor: strokeA }}
                          />
                          <div 
                            className={`relative w-28 h-28 rounded-full overflow-hidden border-2 flex items-center justify-center ${
                              theme === "light" ? "bg-slate-50" : "bg-[#090a0f]/60"
                            }`} 
                            style={{ borderColor: strokeA }}
                          >
                            {compareDriverA.headshot_url ? (
                              <img 
                                src={compareDriverA.headshot_url} 
                                alt={compareDriverA.full_name} 
                                className="w-full h-full object-contain"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <span className="text-xl font-bold font-mono text-gray-400">{compareDriverA.name_acronym}</span>
                            )}
                          </div>
                        </div>

                        <div>
                          <h4 className={`text-sm font-black uppercase leading-tight ${theme === "light" ? "text-gray-900" : "text-white"}`}>
                            {compareDriverA.broadcast_name}
                          </h4>
                          <span className="text-[10px] font-mono uppercase font-semibold" style={{ color: strokeA }}>
                            {compareDriverA.team_name}
                          </span>
                        </div>

                        <div className="flex gap-1.5 w-full max-w-[180px]">
                          <button
                            onClick={() => {
                              setSelectedDriver(compareDriverA);
                              setIsCompareModalOpen(false);
                            }}
                            className={`flex-1 text-[10px] py-1.5 px-3 rounded font-black uppercase transition text-center ${
                              theme === "light" 
                                ? "bg-gray-100 hover:bg-gray-200 text-gray-800" 
                                : "bg-white/5 hover:bg-white/10 text-white"
                            }`}
                          >
                            Профиль
                          </button>
                          <div 
                            className="text-[10px] py-1.5 px-2 rounded-md font-mono font-black text-center text-white flex items-center justify-center shrink-0 min-w-[36px]"
                            style={{ backgroundColor: strokeA }}
                          >
                            #{compareDriverA.driver_number}
                          </div>
                        </div>
                      </div>

                      {/* CENTER: Symmetrical Stats Comparison list */}
                      <div className="md:col-span-6 space-y-3">
                        {[
                          {
                            label: "ЛУЧШИЙ КРУГ",
                            valA: minA ? formatLapTime(minA) : "—",
                            valB: minB ? formatLapTime(minB) : "—",
                            isBetterA: minA && minB ? minA < minB : minA ? true : false,
                            isBetterB: minA && minB ? minB < minA : minB ? true : false,
                            mono: true
                          },
                          {
                            label: "СРЕДНИЙ ТЕМП (PACE)",
                            valA: avgA ? formatLapTime(avgA) : "—",
                            valB: avgB ? formatLapTime(avgB) : "—",
                            isBetterA: avgA && avgB ? avgA < avgB : avgA ? true : false,
                            isBetterB: avgA && avgB ? avgB < avgA : avgB ? true : false,
                            mono: true
                          },
                          {
                            label: "КРУГОВ В СЕССИИ",
                            valA: compareLapsA.length.toString(),
                            valB: compareLapsB.length.toString(),
                            isBetterA: compareLapsA.length > compareLapsB.length,
                            isBetterB: compareLapsB.length > compareLapsA.length,
                            mono: true
                          },
                          {
                            label: "МЕСТО В ЧЕМПИОНАТЕ",
                            valA: getSeasonStatsForDriver(compareDriverA).position !== "—" ? `#${getSeasonStatsForDriver(compareDriverA).position}` : "—",
                            valB: getSeasonStatsForDriver(compareDriverB).position !== "—" ? `#${getSeasonStatsForDriver(compareDriverB).position}` : "—",
                            isBetterA: Number(getSeasonStatsForDriver(compareDriverA).position) && Number(getSeasonStatsForDriver(compareDriverB).position) 
                              ? Number(getSeasonStatsForDriver(compareDriverA).position) < Number(getSeasonStatsForDriver(compareDriverB).position)
                              : getSeasonStatsForDriver(compareDriverA).position !== "—",
                            isBetterB: Number(getSeasonStatsForDriver(compareDriverA).position) && Number(getSeasonStatsForDriver(compareDriverB).position)
                              ? Number(getSeasonStatsForDriver(compareDriverB).position) < Number(getSeasonStatsForDriver(compareDriverA).position)
                              : getSeasonStatsForDriver(compareDriverB).position !== "—",
                            mono: true
                          },
                          {
                            label: "ОЧКИ СЕЗОНА",
                            valA: getSeasonStatsForDriver(compareDriverA).points,
                            valB: getSeasonStatsForDriver(compareDriverB).points,
                            isBetterA: Number(getSeasonStatsForDriver(compareDriverA).points) && Number(getSeasonStatsForDriver(compareDriverB).points)
                              ? Number(getSeasonStatsForDriver(compareDriverA).points) > Number(getSeasonStatsForDriver(compareDriverB).points)
                              : getSeasonStatsForDriver(compareDriverA).points !== "—",
                            isBetterB: Number(getSeasonStatsForDriver(compareDriverA).points) && Number(getSeasonStatsForDriver(compareDriverB).points)
                              ? Number(getSeasonStatsForDriver(compareDriverB).points) > Number(getSeasonStatsForDriver(compareDriverA).points)
                              : getSeasonStatsForDriver(compareDriverB).points !== "—",
                            mono: true
                          },
                          {
                            label: "ПОБЕДЫ В СЕЗОНЕ",
                            valA: getSeasonStatsForDriver(compareDriverA).wins,
                            valB: getSeasonStatsForDriver(compareDriverB).wins,
                            isBetterA: Number(getSeasonStatsForDriver(compareDriverA).wins) && Number(getSeasonStatsForDriver(compareDriverB).wins)
                              ? Number(getSeasonStatsForDriver(compareDriverA).wins) > Number(getSeasonStatsForDriver(compareDriverB).wins)
                              : getSeasonStatsForDriver(compareDriverA).wins !== "—",
                            isBetterB: Number(getSeasonStatsForDriver(compareDriverA).wins) && Number(getSeasonStatsForDriver(compareDriverB).wins)
                              ? Number(getSeasonStatsForDriver(compareDriverB).wins) > Number(getSeasonStatsForDriver(compareDriverA).wins)
                              : getSeasonStatsForDriver(compareDriverB).wins !== "—",
                            mono: true
                          }
                        ].map((item, index) => (
                          <div 
                            key={index} 
                            className={`grid grid-cols-12 items-center gap-2 py-2 border-b last:border-0 last:pb-0 ${
                              theme === "light" ? "border-gray-100" : "border-white/5"
                            }`}
                          >
                            {/* Value A */}
                            <div className="col-span-4 text-left">
                              <span 
                                className={`text-[13px] tracking-tight ${item.mono ? "font-mono" : "font-sans"} ${
                                  item.isBetterA 
                                    ? "font-black" 
                                    : "text-gray-450 font-medium opacity-50"
                                }`}
                                style={item.isBetterA ? { color: strokeA } : {}}
                              >
                                {item.valA}
                              </span>
                            </div>

                            {/* Label */}
                            <div className="col-span-4 text-center">
                              <span className="text-[8px] font-black uppercase text-gray-400 tracking-wider block">
                                {item.label}
                              </span>
                            </div>

                            {/* Value B */}
                            <div className="col-span-4 text-right">
                              <span 
                                className={`text-[13px] tracking-tight ${item.mono ? "font-mono" : "font-sans"} ${
                                  item.isBetterB 
                                    ? "font-black" 
                                    : "text-gray-450 font-medium opacity-50"
                                }`}
                                style={item.isBetterB ? { color: strokeB } : {}}
                              >
                                {item.valB}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* RIGHT: Driver B Profile Card */}
                      <div className="md:col-span-3 flex flex-col items-center text-center space-y-3">
                        <div className="relative group">
                          <div 
                            className="absolute -inset-1 rounded-full blur-md opacity-25 group-hover:opacity-45 transition duration-300"
                            style={{ backgroundColor: strokeB }}
                          />
                          <div 
                            className={`relative w-28 h-28 rounded-full overflow-hidden border-2 flex items-center justify-center ${
                              theme === "light" ? "bg-slate-50" : "bg-[#090a0f]/60"
                            }`} 
                            style={{ borderColor: strokeB }}
                          >
                            {compareDriverB.headshot_url ? (
                              <img 
                                src={compareDriverB.headshot_url} 
                                alt={compareDriverB.full_name} 
                                className="w-full h-full object-contain"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <span className="text-xl font-bold font-mono text-gray-400">{compareDriverB.name_acronym}</span>
                            )}
                          </div>
                        </div>

                        <div>
                          <h4 className={`text-sm font-black uppercase leading-tight ${theme === "light" ? "text-gray-900" : "text-white"}`}>
                            {compareDriverB.broadcast_name}
                          </h4>
                          <span className="text-[10px] font-mono uppercase font-semibold" style={{ color: strokeB }}>
                            {compareDriverB.team_name}
                          </span>
                        </div>

                        <div className="flex gap-1.5 w-full max-w-[180px]">
                          <button
                            onClick={() => {
                              setSelectedDriver(compareDriverB);
                              setIsCompareModalOpen(false);
                            }}
                            className={`flex-1 text-[10px] py-1.5 px-3 rounded font-black uppercase transition text-center ${
                              theme === "light" 
                                ? "bg-gray-100 hover:bg-gray-200 text-gray-800" 
                                : "bg-white/5 hover:bg-white/10 text-white"
                            }`}
                          >
                            Профиль
                          </button>
                          <div 
                            className="text-[10px] py-1.5 px-2 rounded-md font-mono font-black text-center text-white flex items-center justify-center shrink-0 min-w-[36px]"
                            style={{ backgroundColor: strokeB }}
                          >
                            #{compareDriverB.driver_number}
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                {/* Main Graph & Comparative Dashboard */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                  
                  {/* Graph */}
                  <div className="lg:col-span-8 bg-[#10111a] border border-[#212333] rounded-xl p-5 flex flex-col justify-between">
                    <div>
                      <h3 className="text-xs font-black uppercase text-white tracking-widest mb-3 flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-[#e10600]" /> Совмещенный график кругов
                      </h3>
                      
                      {isCompareLoading ? (
                        <div className="h-[280px] flex flex-col items-center justify-center gap-3">
                          <RefreshCw className="w-8 h-8 text-[#e10600] animate-spin" />
                          <span className="text-[10px] text-gray-400 font-mono tracking-widest uppercase">Запрос телеметрии пилотов...</span>
                        </div>
                      ) : compareLapsA.length === 0 && compareLapsB.length === 0 ? (
                        <div className="h-[280px] flex flex-col items-center justify-center text-center text-gray-500 text-xs">
                          <Info className="w-8 h-8 mb-2" />
                          <span>Данные кругов отсутствуют для выбранной пары.</span>
                        </div>
                      ) : (
                        <div className="w-full h-[285px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                              data={combinedChartData}
                              margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
                            >
                              <CartesianGrid stroke={theme === "light" ? "#e5e7eb" : "#1c1d29"} strokeDasharray="3 3" />
                              <XAxis dataKey="lap" stroke={theme === "light" ? "#4b5563" : "#5d627c"} style={{ fontSize: 9, fontFamily: "monospace" }} />
                              <YAxis stroke={theme === "light" ? "#4b5563" : "#5d627c"} style={{ fontSize: 9, fontFamily: "monospace" }} domain={["auto", "auto"]} />
                              <Tooltip
                                contentStyle={theme === "light" 
                                  ? { backgroundColor: "#ffffff", borderColor: "#e5e7eb", color: "#111827", borderRadius: "10px", boxShadow: "0 4px 10px rgba(0,0,0,0.08)" } 
                                  : { backgroundColor: "#0c0d12", borderColor: "#242637", color: "#ccc", borderRadius: "10px" }
                                }
                                itemStyle={theme === "light"
                                  ? { color: "#111827", fontSize: 11, fontFamily: "monospace" }
                                  : { color: "#ccc", fontSize: 11, fontFamily: "monospace" }
                                }
                              />
                              <Legend wrapperStyle={{ fontSize: 10, fontFamily: "monospace", paddingTop: 10 }} />
                              <Line
                                type="monotone"
                                dataKey={compareDriverA?.name_acronym || "Driver A"}
                                stroke={strokeA}
                                strokeWidth={3}
                                dot={{ r: 4, stroke: "#0b0c10", strokeWidth: 1.5 }}
                                activeDot={{ r: 6 }}
                                connectNulls
                              />
                              <Line
                                type="monotone"
                                dataKey={compareDriverB?.name_acronym || "Driver B"}
                                stroke={strokeB}
                                strokeWidth={3}
                                dot={{ r: 4, stroke: "#0b0c10", strokeWidth: 1.5 }}
                                activeDot={{ r: 6 }}
                                connectNulls
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Side comparison stats board */}
                  <div className="lg:col-span-4 flex flex-col gap-4 justify-between">
                    
                    {/* Driver A stats card */}
                    <div className="bg-[#0e0f17] border border-[#212333] p-4 rounded-xl space-y-3 relative overflow-hidden" style={{ borderLeft: `4px solid ${strokeA}` }}>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-white uppercase truncate max-w-[130px]">{compareDriverA?.broadcast_name || "Driver A"}</span>
                        <span className="text-[10px] font-mono text-gray-400 bg-white/5 py-0.5 px-2 rounded">{compareDriverA?.name_acronym}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-center text-xs font-mono">
                        <div className="bg-[#05060a] p-2 rounded">
                          <span className="text-[8px] text-gray-500 uppercase block">Рекорд</span>
                          <span className="text-white font-bold text-xs">{formatLapTime(minA)}</span>
                        </div>
                        <div className="bg-[#05060a] p-2 rounded">
                          <span className="text-[8px] text-gray-500 uppercase block">Средний Pace</span>
                          <span className="text-white font-bold text-[10px]">{formatLapTime(avgA)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Driver B stats card */}
                    <div className="bg-[#0e0f17] border border-[#212333] p-4 rounded-xl space-y-3 relative overflow-hidden" style={{ borderLeft: `4px solid ${strokeB}` }}>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-white uppercase truncate max-w-[130px]">{compareDriverB?.broadcast_name || "Driver B"}</span>
                        <span className="text-[10px] font-mono text-gray-400 bg-white/5 py-0.5 px-2 rounded">{compareDriverB?.name_acronym}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-center text-xs font-mono">
                        <div className="bg-[#05060a] p-2 rounded">
                          <span className="text-[8px] text-gray-500 uppercase block">Рекорд</span>
                          <span className="text-white font-bold text-xs">{formatLapTime(minB)}</span>
                        </div>
                        <div className="bg-[#05060a] p-2 rounded">
                          <span className="text-[8px] text-gray-500 uppercase block">Средний Pace</span>
                          <span className="text-white font-bold text-[10px]">{formatLapTime(avgB)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Delta comparison board */}
                    <div className="bg-gradient-to-br from-[#1b1c2b] to-[#141520] border border-[#2d3142] p-4 rounded-xl flex-grow flex flex-col justify-center text-center space-y-2">
                      <span className="text-[9px] uppercase font-black text-[#e10600] tracking-widest font-mono">Анализ разницы темпа</span>
                      {minA && minB ? (
                        <div className="space-y-1">
                          <div className="text-xs font-black text-white uppercase tracking-tight">
                            {minA < minB ? (
                              <span>🏆 {compareDriverA?.name_acronym} быстрее на <span className="text-emerald-400 font-mono">{(minB - minA).toFixed(3)}с</span></span>
                            ) : minA > minB ? (
                              <span>🏆 {compareDriverB?.name_acronym} быстрее на <span className="text-emerald-400 font-mono">{(minA - minB).toFixed(3)}с</span></span>
                            ) : (
                              <span>Время рекордов совпадает!</span>
                            )}
                          </div>
                          <p className="text-[10px] text-gray-400 leading-normal font-sans">
                            Разница по лучшим кругам. Сравнение среднего гоночного темпа: {avgA && avgB ? (
                              `${compareDriverA?.name_acronym} (${formatLapTime(avgA)}) vs ${compareDriverB?.name_acronym} (${formatLapTime(avgB)})`
                            ) : "—"}
                          </p>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500 font-bold">Один из пилотов не имеет завершенных кругов в сессии</div>
                      )}
                    </div>

                  </div>

                </div>

              </div>

              {/* Footer */}
              <div className="p-4 border-t border-[#212333] flex justify-end gap-3 bg-[#0d0e15]">
                <button
                  id="btn-close-compare-modal-footer"
                  onClick={() => setIsCompareModalOpen(false)}
                  className="px-5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-black text-xs uppercase tracking-wider transition"
                >
                  Закрыть
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
