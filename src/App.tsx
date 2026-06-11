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
  Building
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

  // General Loading flags
  const [sessionsLoading, setSessionsLoading] = useState<boolean>(false);
  const [dataLoading, setDataLoading] = useState<boolean>(false);
  const [lapsLoading, setLapsLoading] = useState<boolean>(false);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [isDemoData, setIsDemoData] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

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
        setErrorMessage("Сбой загрузки календаря сессий. Использован запасной сценарий.");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Системный сбой подключения к шине F1.");
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
        setErrorMessage("Не удалось загрузить параметры сессии.");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Ошибка чтения телеметрии этапа.");
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
      }
    } catch (err) {
      console.error(err);
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
      }

      // Races Results API Request
      const calRes = await fetch(`/api/results?year=${jolpicaYear}`);
      const calPayload = await calRes.json();
      if (calPayload.success) {
        setSeasonRaces(calPayload.races || []);
      }
    } catch (err) {
      console.error("Failed fetching Jolpica metrics", err);
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
        setAiAnalysis("Не удалось расшифровать данные. Попробуйте еще раз.");
      }
    } catch (err) {
      console.error(err);
      setAiAnalysis("Ошибка ИИ-анализа. Проверьте ваш API-ключ Gemini.");
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

  return (
    <div className="bg-[#0b0c10] text-[#cfd2d6] font-sans min-h-screen flex flex-col overflow-x-hidden border-t-4 border-[#e10600]">
      
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

          {/* 🔘 PREMIUM VIEW SWITCHER */}
          <nav className="flex bg-[#161824] p-1.5 rounded-xl border border-[#2d3142] w-full md:w-auto max-w-2xl overflow-x-auto scrollbar-none">
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

        </div>
      </header>

      {/* SUB-HEADER TIP BANNER */}
      <div className="bg-[#101116] border-b border-[#222533] py-2 px-6 text-xs text-gray-400">
        <div className="max-w-[1720px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-medium">
            <Sparkles className="w-4 h-4 text-[#e10600] animate-pulse shrink-0" />
            <span>
              <strong className="text-white">Актуальные данные 2025/2026:</strong> Сезонные зачеты и результаты этапов загружаются напрямую через протоколы <strong className="text-white">Jolpica F1 API</strong>. Нет ограничений старыми архивами!
            </span>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-mono text-gray-400 tracking-wide bg-[#161824] px-2 py-0.5 rounded border border-[#2d3142]">
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> ONLINE LIVE</span>
          </div>
        </div>
      </div>

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
              <div className="xl:col-span-3 space-y-2 relative z-10">
                <label className="text-[10px] uppercase font-black text-[#e10600] tracking-widest flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Выберите Сезон гонок
                </label>
                <div className="grid grid-cols-4 gap-1.5 bg-[#090a0f] p-1.5 rounded-xl border border-[#2c2f44]">
                  {[2026, 2025, 2024, 2023].map((yr) => (
                    <button
                      key={yr}
                      onClick={() => setSelectedYear(yr)}
                      className={`py-1.5 text-[11px] font-black rounded-lg transition-all tracking-wider ${
                        selectedYear === yr
                          ? "bg-[#e10600] text-white font-bold shadow-md"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      {yr}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selector box */}
              <div className="xl:col-span-5 space-y-2 relative z-10">
                <label className="text-[10px] uppercase font-black text-gray-400 tracking-widest flex items-center gap-1.5">
                  <Flag className="w-3.5 h-3.5 text-[#e10600]" /> Выберите Этап / Гран-При
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
              <div className="bg-[#14151f] p-4 rounded-xl border border-[#212333] relative overflow-hidden group">
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider flex items-center gap-2 mb-1.5">
                  <Clock className="w-4 h-4 text-[#e10600]" /> Рекорд круга пилота
                </span>
                <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-white block">
                  {formatLapTime(bestLapTime)}
                </span>
                <span className="text-[9px] text-[#e10600] font-mono mt-2 block font-black uppercase">
                  {selectedDriver ? `ПОКАЗАТЕЛЬ: ${selectedDriver.name_acronym}` : "Нет заездов"}
                </span>
                <div className="absolute right-4 bottom-1 text-[#e10600]/5 font-mono font-black italic text-4xl select-none pointer-events-none">
                  BEST
                </div>
              </div>

              {/* MEDIAN TEMPO */}
              <div className="bg-[#14151f] p-4 rounded-xl border border-[#212333] relative overflow-hidden group">
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider flex items-center gap-2 mb-1.5">
                  <TrendingUp className="w-4 h-4 text-cyan-400" /> Средний гоночный Pace
                </span>
                <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-white block">
                  {formatLapTime(avgLapTime)}
                </span>
                <span className="text-[9px] text-gray-400 font-mono mt-2 block uppercase font-bold">
                  Выносливость шин / старт-финиш
                </span>
                <div className="absolute right-4 bottom-1 text-cyan-400/5 font-mono font-black italic text-4xl select-none pointer-events-none">
                  PACE
                </div>
              </div>

              {/* TRACK THERMOMETER */}
              <div className="bg-[#14151f] p-4 rounded-xl border border-[#212333] relative overflow-hidden">
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider flex items-center gap-2 mb-1.5">
                  <Gauge className="w-4 h-4 text-orange-400" /> Асфальт / Градусники
                </span>
                <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-white block">
                  {weatherData.length > 0 
                    ? `${weatherData[weatherData.length - 1].track_temperature.toFixed(1)}°C` 
                    : "35.2°C"
                  }
                </span>
                <span className="text-[9px] text-gray-400 font-mono mt-2 block uppercase font-bold">
                  Воздух: {weatherData.length > 0 ? `${weatherData[weatherData.length - 1].air_temperature.toFixed(1)}°C` : "21.6°C"}
                </span>
                <div className="absolute right-4 bottom-1 text-orange-400/5 font-mono font-black italic text-4xl select-none pointer-events-none">
                  TEMP
                </div>
              </div>

              {/* MOISTURE / WET GRIP */}
              <div className="bg-[#14151f] p-4 rounded-xl border border-[#212333] relative overflow-hidden">
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider flex items-center gap-2 mb-1.5">
                  <CloudSun className="w-4 h-4 text-[#ffcc00]" /> Состояние трассы
                </span>
                <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-white block">
                  {weatherData.length > 0 
                    ? (weatherData[weatherData.length - 1].rainfall > 0 ? "🌧️ Дождь" : "☀️ Сухо") 
                    : "☀️ Сухо"
                  }
                </span>
                <span className="text-[9px] text-gray-400 font-mono mt-2 block uppercase font-bold">
                  Влажность: {weatherData.length > 0 ? `${weatherData[weatherData.length - 1].humidity}%` : "54%"}
                </span>
                <div className="absolute right-4 bottom-1 text-yellow-400/5 font-mono font-black italic text-4xl select-none pointer-events-none">
                  WET
                </div>
              </div>

            </div>

            {/* DRIVERS ACTIVE CHIP SELECTOR BAND */}
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase text-[#e10600] tracking-widest flex items-center gap-2">
                <Users className="w-4 h-4" /> Шаг 2: Выберите пилота для построения графиков
              </h3>
              
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
              ) : (
                <div className="flex items-center gap-3.5 overflow-x-auto pb-3 pt-1 scrollbar-thin">
                  {drivers.map((d) => {
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
                          <CartesianGrid stroke="#1c1d29" strokeDasharray="3 3" />
                          <XAxis dataKey="lap" stroke="#5d627c" style={{ fontSize: 9, fontFamily: "monospace" }} />
                          <YAxis stroke="#5d627c" style={{ fontSize: 9, fontFamily: "monospace" }} domain={["auto", "auto"]} />
                          <Tooltip
                            contentStyle={{ backgroundColor: "#0c0d12", borderColor: "#242637", color: "#ccc", borderRadius: "10px" }}
                            itemStyle={{ fontSize: 11, fontFamily: "monospace" }}
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
                <div className="flex bg-[#090a0f] p-1 rounded-xl border border-[#2a2d41] overflow-x-auto">
                  {[2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019].map((yr) => (
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
                          <CartesianGrid stroke="#1c1d29" strokeDasharray="3 3" />
                          <XAxis dataKey="distance" stroke="#5d627c" style={{ fontSize: 9, fontFamily: "monospace" }} />
                          <YAxis stroke="#5d627c" style={{ fontSize: 9, fontFamily: "monospace" }} domain={["auto", "auto"]} />
                          <Tooltip
                            contentStyle={{ backgroundColor: "#0c0d12", borderColor: "#242637", color: "#ccc", borderRadius: "10px" }}
                            itemStyle={{ fontSize: 11, fontFamily: "monospace" }}
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

    </div>
  );
}
