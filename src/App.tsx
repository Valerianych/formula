import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bot,
  Calendar,
  CloudSun,
  Database,
  Flag,
  Gauge,
  GitCompare,
  Map as MapIcon,
  MessageSquare,
  RefreshCw,
  Trophy,
  UserRound,
  Wrench,
} from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type TabId = "results" | "map" | "driver" | "compare" | "issues" | "chat" | "data";
type SessionInfo = {
  session_key: number;
  session_name: string;
  meeting_name: string;
  location: string;
  country_name: string;
  year: number;
  date_start: string;
  winner?: string;
  winnerTeam?: string;
};
type Driver = {
  driver_number: number;
  full_name: string;
  name_acronym?: string;
  team_name?: string;
  team_colour?: string;
  headshot_url?: string;
  starting_position?: number | null;
  finishing_position?: number | null;
  classified_laps?: number | null;
  gap_to_leader?: number | string | null;
  dnf?: boolean;
  dns?: boolean;
  dsq?: boolean;
};
type RaceData = {
  session: SessionInfo;
  summary: any;
  drivers: Driver[];
  driver_summaries: any[];
  race_result: any[];
  starting_grid: any[];
  laps: any[];
  pit_stops: any[];
  stints: any[];
  positions: any[];
  intervals: any[];
  events: any[];
  race_control: any[];
  weather: any[];
  overtakes: any[];
  team_radio: any[];
  track_map: { source_driver_number?: number; source_driver_name?: string; points: any[]; note?: string };
  issues: any[];
  data_quality: Record<string, any>;
};
type ChatMessage = { role: "user" | "assistant"; text: string };

const YEARS = [2026, 2025, 2024, 2023];
const TABS: Array<{ id: TabId; label: string; icon: any }> = [
  { id: "results", label: "Итог", icon: Trophy },
  { id: "map", label: "Карта", icon: MapIcon },
  { id: "driver", label: "Пилот", icon: UserRound },
  { id: "compare", label: "Сравнение", icon: GitCompare },
  { id: "issues", label: "Проблемы", icon: AlertTriangle },
  { id: "chat", label: "ИИ-чат", icon: Bot },
  { id: "data", label: "Данные API", icon: Database },
];

function teamColor(value?: string) {
  if (!value) return "#e10600";
  return value.startsWith("#") ? value : `#${value}`;
}
function formatTime(sec: any) {
  const value = Number(sec);
  if (!Number.isFinite(value) || value <= 0) return "—";
  const minutes = Math.floor(value / 60);
  const seconds = (value % 60).toFixed(3).padStart(6, "0");
  return minutes > 0 ? `${minutes}:${seconds}` : `${seconds} c`;
}
function formatDate(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleString("ru-RU", { dateStyle: "medium", timeStyle: "short" });
}
function statusLabel(driver: Driver) {
  if (driver.dsq) return "DSQ — дисквалифицирован";
  if (driver.dns) return "DNS — не стартовал";
  if (driver.dnf) return "DNF — не финишировал";
  return "Финишировал";
}
function positionText(value: any) {
  return Number.isFinite(Number(value)) ? `${value}` : "—";
}
function shortGap(value: any) {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.join(" / ");
  return String(value);
}
async function apiJson(url: string, options?: RequestInit) {
  const response = await fetch(url, options);
  let payload: any = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `HTTP ${response.status}`);
  }
  return payload;
}
function EmptyBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-zinc-400">
      <div className="font-bold text-zinc-200">{title}</div>
      <p className="mt-1">{text}</p>
    </div>
  );
}
function StatCard({ title, value, hint }: { title: string; value: any; hint?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#151720] p-4 shadow-xl">
      <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">{title}</div>
      <div className="mt-2 text-2xl font-black text-white">{value ?? "—"}</div>
      {hint && <div className="mt-1 text-xs text-zinc-500">{hint}</div>}
    </div>
  );
}

export default function App() {
  const [year, setYear] = useState(2025);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [selectedSessionKey, setSelectedSessionKey] = useState<number | "">("");
  const [race, setRace] = useState<RaceData | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("results");
  const [selectedDriverNumber, setSelectedDriverNumber] = useState<number | "">("");
  const [compareA, setCompareA] = useState<number | "">("");
  const [compareB, setCompareB] = useState<number | "">("");
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingRace, setLoadingRace] = useState(false);
  const [error, setError] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    loadSessions(year);
  }, [year]);

  useEffect(() => {
    if (selectedSessionKey) loadRace(Number(selectedSessionKey));
  }, [selectedSessionKey]);

  const selectedDriver = useMemo(() => {
    if (!race || selectedDriverNumber === "") return null;
    return race.driver_summaries?.find((driver) => driver.driver_number === Number(selectedDriverNumber)) || null;
  }, [race, selectedDriverNumber]);

  const compareDriverA = useMemo(() => {
    if (!race || compareA === "") return null;
    return race.driver_summaries?.find((driver) => driver.driver_number === Number(compareA)) || null;
  }, [race, compareA]);

  const compareDriverB = useMemo(() => {
    if (!race || compareB === "") return null;
    return race.driver_summaries?.find((driver) => driver.driver_number === Number(compareB)) || null;
  }, [race, compareB]);

  const selectedDriverLaps = useMemo(() => {
    if (!race || selectedDriverNumber === "") return [];
    return race.laps
      .filter((lap) => lap.driver_number === Number(selectedDriverNumber) && lap.lap_duration)
      .sort((a, b) => a.lap_number - b.lap_number)
      .map((lap) => ({ lap: lap.lap_number, lap_time: Number(lap.lap_duration?.toFixed?.(3) || lap.lap_duration) }));
  }, [race, selectedDriverNumber]);

  const compareChart = useMemo(() => {
    if (!race || !compareDriverA || !compareDriverB) return [];
    const lapsA = race.laps.filter((lap) => lap.driver_number === compareDriverA.driver_number && lap.lap_duration);
    const lapsB = race.laps.filter((lap) => lap.driver_number === compareDriverB.driver_number && lap.lap_duration);
    const lapNumbers = Array.from(new Set([...lapsA.map((lap) => lap.lap_number), ...lapsB.map((lap) => lap.lap_number)])).sort((a, b) => a - b);
    return lapNumbers.map((lapNumber) => {
      const lapA = lapsA.find((lap) => lap.lap_number === lapNumber);
      const lapB = lapsB.find((lap) => lap.lap_number === lapNumber);
      return {
        lap: lapNumber,
        [compareDriverA.name_acronym || "A"]: lapA?.lap_duration ? Number(lapA.lap_duration.toFixed(3)) : null,
        [compareDriverB.name_acronym || "B"]: lapB?.lap_duration ? Number(lapB.lap_duration.toFixed(3)) : null,
      };
    });
  }, [race, compareDriverA, compareDriverB]);

  async function loadSessions(nextYear: number) {
    setLoadingSessions(true);
    setError("");
    setRace(null);
    setSelectedSessionKey("");
    try {
      const payload = await apiJson(`/api/sessions?year=${nextYear}`);
      const list = payload.sessions || [];
      setSessions(list);
      setSelectedSessionKey(list[0]?.session_key || "");
      if (!list.length) setError(payload.note || "OpenF1 не вернул гонки за этот год.");
    } catch (err: any) {
      setSessions([]);
      setError(err.message || "Не удалось загрузить список гонок OpenF1.");
    } finally {
      setLoadingSessions(false);
    }
  }

  async function loadRace(sessionKey: number) {
    setLoadingRace(true);
    setError("");
    setRace(null);
    try {
      const payload = await apiJson(`/api/race-dashboard?session_key=${sessionKey}`);
      const data: RaceData = payload.data;
      setRace(data);
      const firstDriver = data.summary?.winner?.driver_number || data.drivers?.[0]?.driver_number || "";
      const secondDriver = data.drivers?.find((driver) => driver.driver_number !== firstDriver)?.driver_number || "";
      setSelectedDriverNumber(firstDriver);
      setCompareA(firstDriver);
      setCompareB(secondDriver);
    } catch (err: any) {
      setError(err.message || "Не удалось загрузить данные гонки OpenF1.");
    } finally {
      setLoadingRace(false);
    }
  }

  async function sendChatMessage() {
    const text = chatInput.trim();
    if (!text || !race || chatLoading) return;
    const nextMessages: ChatMessage[] = [...chatMessages, { role: "user", text }];
    setChatMessages(nextMessages);
    setChatInput("");
    setChatLoading(true);
    const compactDriverSummaries = (race.driver_summaries || []).map((driver) => ({
      driver_number: driver.driver_number,
      full_name: driver.full_name,
      team_name: driver.team_name,
      starting_position: driver.starting_position,
      finishing_position: driver.finishing_position,
      position_delta: driver.position_delta,
      best_lap: driver.best_lap,
      average_lap: driver.average_lap,
      pit_stop_count: driver.pit_stop_count,
      dnf: driver.dnf,
      dns: driver.dns,
      dsq: driver.dsq,
    }));
    try {
      const payload = await apiJson("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: text,
          messages: nextMessages.map((message) => ({ role: message.role, content: message.text })),
          raceContext: {
            session: race.session,
            summary: race.summary,
            top3: race.summary?.top3,
            issues: race.issues?.slice(0, 30),
            driver_summaries: compactDriverSummaries,
            data_quality: race.data_quality,
          },
        }),
      });
      setChatMessages([...nextMessages, { role: "assistant", text: payload.answer || payload.analysis || "ИИ не вернул ответ." }]);
    } catch (err: any) {
      setChatMessages([...nextMessages, { role: "assistant", text: `ИИ-чат недоступен: ${err.message || "ошибка запроса"}` }]);
    } finally {
      setChatLoading(false);
    }
  }

  const winner = race?.summary?.winner;
  const top3 = race?.summary?.top3 || [];
  const issueCountByDriver = new globalThis.Map<number, number>();
  for (const issue of race?.issues || []) {
    issueCountByDriver.set(issue.driver_number, (issueCountByDriver.get(issue.driver_number) || 0) + 1);
  }

  return (
    <div className="min-h-screen bg-[#08090d] text-zinc-100">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#11131b]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#e10600] text-xl font-black italic text-white shadow-lg shadow-red-950/50">F1</div>
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight text-white">F1 Race Analytics</h1>
              <p className="text-xs text-zinc-400">OpenF1 Historical Data • GigaChat • без моков и фейковых результатов</p>
            </div>
          </div>
          <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-black/30 p-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition ${activeTab === tab.id ? "bg-[#e10600] text-white" : "text-zinc-400 hover:bg-white/5 hover:text-white"}`}>
                  <Icon className="h-4 w-4" /> {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6">
        <section className="grid gap-4 rounded-3xl border border-white/10 bg-[#11131b] p-5 shadow-2xl lg:grid-cols-[220px_1fr_auto] lg:items-end">
          <div>
            <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500"><Calendar className="h-4 w-4 text-[#e10600]" /> Сезон</label>
            <select value={year} onChange={(event) => setYear(Number(event.target.value))} className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm font-bold text-white outline-none focus:border-[#e10600]">
              {YEARS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500"><Flag className="h-4 w-4 text-[#e10600]" /> Гонка</label>
            <select value={selectedSessionKey} onChange={(event) => setSelectedSessionKey(event.target.value ? Number(event.target.value) : "")} disabled={loadingSessions || sessions.length === 0} className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm font-bold text-white outline-none focus:border-[#e10600] disabled:opacity-50">
              {sessions.length === 0 && <option value="">Нет гонок</option>}
              {sessions.map((session) => <option key={session.session_key} value={session.session_key}>{session.meeting_name} — {session.location} — {formatDate(session.date_start)}</option>)}
            </select>
          </div>
          <button onClick={() => selectedSessionKey && loadRace(Number(selectedSessionKey))} disabled={!selectedSessionKey || loadingRace} className="flex h-[46px] items-center justify-center gap-2 rounded-2xl bg-[#e10600] px-5 text-xs font-black uppercase tracking-widest text-white transition hover:bg-red-700 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loadingRace ? "animate-spin" : ""}`} /> Обновить
          </button>
        </section>

        {error && <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-950/30 p-4 text-sm text-red-100"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" /><div><div className="font-bold">Не удалось загрузить данные</div><div className="text-red-200/80">{error}</div></div></div>}
        {(loadingRace || loadingSessions) && <div className="rounded-3xl border border-white/10 bg-[#11131b] p-8 text-center text-zinc-400"><RefreshCw className="mx-auto mb-3 h-8 w-8 animate-spin text-[#e10600]" />Загрузка данных OpenF1...</div>}
        {!loadingRace && !race && !error && <EmptyBlock title="Выбери гонку" text="После выбора сезона и гонки сайт загрузит итог, пилотов, пит-стопы, шины, карту, инциденты и данные для сравнения." />}

        {race && (
          <>
            <section className="grid gap-4 lg:grid-cols-4">
              <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#191b26] to-[#101119] p-5 lg:col-span-2">
                <div className="text-xs font-bold uppercase tracking-[0.25em] text-[#e10600]">{race.session.session_name}</div>
                <h2 className="mt-2 text-3xl font-black text-white">{race.session.meeting_name}</h2>
                <p className="mt-2 text-sm text-zinc-400">{race.session.location}, {race.session.country_name} • {formatDate(race.session.date_start)}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-emerald-500/10 px-3 py-1 font-bold text-emerald-300">OpenF1 API</span><span className="rounded-full bg-blue-500/10 px-3 py-1 font-bold text-blue-300">без моков</span><span className="rounded-full bg-white/5 px-3 py-1 font-bold text-zinc-300">{race.data_quality?.has_location ? "карта доступна" : "карта может быть недоступна"}</span></div>
              </div>
              <StatCard title="Победитель" value={winner?.full_name || race.session.winner || "—"} hint={winner?.team_name || race.session.winnerTeam} />
              <StatCard title="Пилотов" value={race.summary?.total_drivers || race.drivers.length} hint={`DNF: ${race.summary?.dnf_count || 0}, DSQ: ${race.summary?.dsq_count || 0}`} />
            </section>

            {activeTab === "results" && <ResultsTab race={race} top3={top3} issueCountByDriver={issueCountByDriver} setSelectedDriverNumber={setSelectedDriverNumber} setActiveTab={setActiveTab} />}
            {activeTab === "map" && <MapTab race={race} />}
            {activeTab === "driver" && <DriverTab race={race} selectedDriverNumber={selectedDriverNumber} selectedDriver={selectedDriver} selectedDriverLaps={selectedDriverLaps} setSelectedDriverNumber={setSelectedDriverNumber} />}
            {activeTab === "compare" && <CompareTab race={race} compareA={compareA} compareB={compareB} compareDriverA={compareDriverA} compareDriverB={compareDriverB} compareChart={compareChart} issueCountByDriver={issueCountByDriver} setCompareA={setCompareA} setCompareB={setCompareB} />}
            {activeTab === "issues" && <IssuesTab race={race} />}
            {activeTab === "chat" && <ChatTab chatInput={chatInput} chatMessages={chatMessages} chatLoading={chatLoading} setChatInput={setChatInput} sendChatMessage={sendChatMessage} />}
            {activeTab === "data" && <DataTab race={race} />}
          </>
        )}
      </main>
    </div>
  );
}

function ResultsTab({ race, top3, issueCountByDriver, setSelectedDriverNumber, setActiveTab }: any) {
  return (
    <section className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-3">{top3.map((driver: Driver, index: number) => <div key={driver.driver_number} className="rounded-3xl border border-white/10 bg-[#151720] p-5 shadow-xl"><div className="text-xs font-black uppercase tracking-[0.25em] text-[#e10600]">{index + 1} место</div><div className="mt-3 flex items-center gap-4"><img src={driver.headshot_url || ""} alt="" className="h-16 w-16 rounded-2xl bg-black/40 object-cover" /><div><div className="text-xl font-black text-white">{driver.full_name}</div><div className="text-sm" style={{ color: teamColor(driver.team_colour) }}>{driver.team_name}</div></div></div></div>)}</div>
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#11131b]"><div className="border-b border-white/10 p-5"><h3 className="text-xl font-black text-white">Итог гонки</h3><p className="mt-1 text-sm text-zinc-400">Позиции берутся из OpenF1 session_result.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-black/30 text-xs uppercase tracking-widest text-zinc-500"><tr><th className="px-4 py-3">Место</th><th className="px-4 py-3">Пилот</th><th className="px-4 py-3">Команда</th><th className="px-4 py-3">Старт</th><th className="px-4 py-3">Круги</th><th className="px-4 py-3">Отставание</th><th className="px-4 py-3">Статус</th><th className="px-4 py-3">Проблемы</th></tr></thead><tbody>{race.drivers.map((driver: Driver) => <tr key={driver.driver_number} className="border-t border-white/5 hover:bg-white/[0.03]"><td className="px-4 py-3 font-black text-white">{positionText(driver.finishing_position)}</td><td className="px-4 py-3"><button onClick={() => { setSelectedDriverNumber(driver.driver_number); setActiveTab("driver"); }} className="flex items-center gap-3 text-left hover:text-white"><img src={driver.headshot_url || ""} alt="" className="h-10 w-10 rounded-xl bg-black/40 object-cover" /><span><span className="block font-bold text-white">{driver.full_name}</span><span className="text-xs text-zinc-500">#{driver.driver_number} • {driver.name_acronym}</span></span></button></td><td className="px-4 py-3 font-bold" style={{ color: teamColor(driver.team_colour) }}>{driver.team_name}</td><td className="px-4 py-3">{positionText(driver.starting_position)}</td><td className="px-4 py-3">{positionText(driver.classified_laps)}</td><td className="px-4 py-3">{shortGap(driver.gap_to_leader)}</td><td className="px-4 py-3 text-xs text-zinc-400">{statusLabel(driver)}</td><td className="px-4 py-3">{issueCountByDriver.get(driver.driver_number) || 0}</td></tr>)}</tbody></table></div></div>
    </section>
  );
}

function MapTab({ race }: any) {
  return <section className="rounded-3xl border border-white/10 bg-[#11131b] p-5"><h3 className="flex items-center gap-2 text-xl font-black text-white"><MapIcon className="h-5 w-5 text-[#e10600]" /> Карта трассы</h3><p className="mt-1 text-sm text-zinc-400">OpenF1 отдаёт x/y/z координаты машин, это не географическая карта.</p>{race.track_map?.points?.length ? <div className="mt-5 rounded-3xl border border-white/10 bg-black p-4"><svg viewBox="0 0 100 100" className="h-[520px] w-full"><polyline points={race.track_map.points.map((point: any) => `${point.x},${point.y}`).join(" ")} fill="none" stroke="#e10600" strokeWidth="0.65" strokeLinecap="round" strokeLinejoin="round" />{race.track_map.points.filter((_: any, index: number) => index % 80 === 0).map((point: any, index: number) => <circle key={`${point.date}-${index}`} cx={point.x} cy={point.y} r="0.65" fill="#ffffff" opacity="0.45" />)}</svg><p className="mt-3 text-xs text-zinc-500">Источник линии: {race.track_map.source_driver_name || "пилот не указан"}. {race.track_map.note}</p></div> : <EmptyBlock title="Карта недоступна" text={race.track_map?.note || "OpenF1 не вернул location-координаты для этой сессии."} />}</section>;
}

function DriverTab({ race, selectedDriverNumber, selectedDriver, selectedDriverLaps, setSelectedDriverNumber }: any) {
  return <section className="grid gap-6 lg:grid-cols-[320px_1fr]"><div className="rounded-3xl border border-white/10 bg-[#11131b] p-5"><label className="mb-2 block text-xs font-bold uppercase tracking-widest text-zinc-500">Пилот</label><select value={selectedDriverNumber} onChange={(event) => setSelectedDriverNumber(Number(event.target.value))} className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm font-bold text-white outline-none focus:border-[#e10600]">{race.drivers.map((driver: Driver) => <option key={driver.driver_number} value={driver.driver_number}>{driver.full_name}</option>)}</select>{selectedDriver && <div className="mt-5"><img src={selectedDriver.headshot_url || ""} alt="" className="h-40 w-full rounded-3xl bg-black/40 object-contain" /><h3 className="mt-4 text-2xl font-black text-white">{selectedDriver.full_name}</h3><p className="font-bold" style={{ color: teamColor(selectedDriver.team_colour) }}>{selectedDriver.team_name}</p><div className="mt-4 grid grid-cols-2 gap-3 text-sm"><StatCard title="Финиш" value={positionText(selectedDriver.finishing_position)} /><StatCard title="Старт" value={positionText(selectedDriver.starting_position)} /><StatCard title="Лучший круг" value={formatTime(selectedDriver.best_lap)} /><StatCard title="Пит-стопы" value={selectedDriver.pit_stop_count ?? 0} /></div></div>}</div>{selectedDriver ? <div className="grid gap-6"><div className="rounded-3xl border border-white/10 bg-[#11131b] p-5"><h3 className="flex items-center gap-2 text-xl font-black text-white"><Gauge className="h-5 w-5 text-[#e10600]" /> Круги пилота</h3>{selectedDriverLaps.length ? <div className="mt-4 h-80"><ResponsiveContainer width="100%" height="100%"><LineChart data={selectedDriverLaps}><CartesianGrid strokeDasharray="3 3" stroke="#27272a" /><XAxis dataKey="lap" stroke="#a1a1aa" /><YAxis stroke="#a1a1aa" domain={["dataMin - 1", "dataMax + 1"]} /><Tooltip contentStyle={{ background: "#11131b", border: "1px solid #333", borderRadius: 12 }} /><Line type="monotone" dataKey="lap_time" stroke={teamColor(selectedDriver.team_colour)} dot={false} strokeWidth={2} /></LineChart></ResponsiveContainer></div> : <EmptyBlock title="Круги недоступны" text="OpenF1 не вернул lap_duration по этому пилоту." />}</div><div className="grid gap-6 lg:grid-cols-2"><SimpleList title="Пит-стопы" icon={<Wrench className="h-5 w-5 text-[#e10600]" />} items={selectedDriver.pit_stops || []} empty="OpenF1 не вернул pit-данные по этому пилоту." render={(pit: any, index: number) => <div key={index} className="rounded-2xl bg-white/[0.03] p-3 text-sm"><div className="font-bold text-white">Круг {pit.lap_number ?? "—"}</div><div className="text-zinc-400">Остановка: {formatTime(pit.stop_duration)} • пит-лейн: {formatTime(pit.lane_duration)}</div></div>} /><SimpleList title="Шины" icon={<Activity className="h-5 w-5 text-[#e10600]" />} items={selectedDriver.stints || []} empty="OpenF1 не вернул stints по этому пилоту." render={(stint: any) => <div key={stint.stint_number} className="rounded-2xl bg-white/[0.03] p-3 text-sm"><div className="font-bold text-white">{stint.compound}</div><div className="text-zinc-400">Круги {stint.lap_start ?? "—"}–{stint.lap_end ?? "—"}, возраст шин: {stint.tyre_age_at_start ?? "—"}</div></div>} /></div></div> : <EmptyBlock title="Пилот не выбран" text="Выберите пилота из списка." />}</section>;
}

function SimpleList({ title, icon, items, empty, render }: any) {
  return <div className="rounded-3xl border border-white/10 bg-[#11131b] p-5"><h3 className="flex items-center gap-2 text-lg font-black text-white">{icon} {title}</h3><div className="mt-4 space-y-2">{items.length ? items.map(render) : <EmptyBlock title="Нет данных" text={empty} />}</div></div>;
}

function CompareTab({ race, compareA, compareB, compareDriverA, compareDriverB, compareChart, issueCountByDriver, setCompareA, setCompareB }: any) {
  return <section className="grid gap-6"><div className="grid gap-4 md:grid-cols-2"><select value={compareA} onChange={(event) => setCompareA(Number(event.target.value))} className="rounded-2xl border border-white/10 bg-[#11131b] px-4 py-3 text-sm font-bold text-white outline-none focus:border-[#e10600]">{race.drivers.map((driver: Driver) => <option key={driver.driver_number} value={driver.driver_number}>{driver.full_name}</option>)}</select><select value={compareB} onChange={(event) => setCompareB(Number(event.target.value))} className="rounded-2xl border border-white/10 bg-[#11131b] px-4 py-3 text-sm font-bold text-white outline-none focus:border-[#e10600]">{race.drivers.map((driver: Driver) => <option key={driver.driver_number} value={driver.driver_number}>{driver.full_name}</option>)}</select></div>{compareDriverA && compareDriverB ? <><div className="overflow-hidden rounded-3xl border border-white/10 bg-[#11131b]"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-black/30 text-xs uppercase tracking-widest text-zinc-500"><tr><th className="px-4 py-3">Показатель</th><th className="px-4 py-3">{compareDriverA.full_name}</th><th className="px-4 py-3">{compareDriverB.full_name}</th></tr></thead><tbody>{[["Финиш", positionText(compareDriverA.finishing_position), positionText(compareDriverB.finishing_position)], ["Старт", positionText(compareDriverA.starting_position), positionText(compareDriverB.starting_position)], ["Изменение позиции", compareDriverA.position_delta ?? "—", compareDriverB.position_delta ?? "—"], ["Лучший круг", formatTime(compareDriverA.best_lap), formatTime(compareDriverB.best_lap)], ["Средний круг", formatTime(compareDriverA.average_lap), formatTime(compareDriverB.average_lap)], ["Медианный круг", formatTime(compareDriverA.median_lap), formatTime(compareDriverB.median_lap)], ["Пит-стопы", compareDriverA.pit_stop_count ?? 0, compareDriverB.pit_stop_count ?? 0], ["Средний пит-стоп", formatTime(compareDriverA.average_pit_stop), formatTime(compareDriverB.average_pit_stop)], ["Проблемные моменты", issueCountByDriver.get(compareDriverA.driver_number) || 0, issueCountByDriver.get(compareDriverB.driver_number) || 0]].map((row) => <tr key={String(row[0])} className="border-t border-white/5"><td className="px-4 py-3 font-bold text-zinc-300">{row[0]}</td><td className="px-4 py-3 text-white">{row[1]}</td><td className="px-4 py-3 text-white">{row[2]}</td></tr>)}</tbody></table></div>{compareChart.length ? <div className="h-96 rounded-3xl border border-white/10 bg-[#11131b] p-5"><ResponsiveContainer width="100%" height="100%"><LineChart data={compareChart}><CartesianGrid strokeDasharray="3 3" stroke="#27272a" /><XAxis dataKey="lap" stroke="#a1a1aa" /><YAxis stroke="#a1a1aa" domain={["dataMin - 1", "dataMax + 1"]} /><Tooltip contentStyle={{ background: "#11131b", border: "1px solid #333", borderRadius: 12 }} /><Legend /><Line type="monotone" dataKey={compareDriverA.name_acronym || "A"} stroke={teamColor(compareDriverA.team_colour)} dot={false} strokeWidth={2} /><Line type="monotone" dataKey={compareDriverB.name_acronym || "B"} stroke={teamColor(compareDriverB.team_colour)} dot={false} strokeWidth={2} /></LineChart></ResponsiveContainer></div> : <EmptyBlock title="График недоступен" text="OpenF1 не вернул круги для сравнения этих пилотов." />}</> : <EmptyBlock title="Выберите двух пилотов" text="После выбора сайт сравнит позиции, темп, пит-стопы и проблемные моменты." />}</section>;
}

function IssuesTab({ race }: any) {
  return <section className="grid gap-4"><div className="rounded-3xl border border-white/10 bg-[#11131b] p-5"><h3 className="text-xl font-black text-white">Проблемные моменты гонки</h3><p className="mt-1 text-sm text-zinc-400">Это не обвинения. Блок строится по Race Control, DNF/DNS/DSQ, потере позиций и медленным пит-стопам.</p></div>{race.issues?.length ? race.issues.map((issue: any, index: number) => <div key={`${issue.driver_number}-${index}`} className="rounded-3xl border border-white/10 bg-[#11131b] p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-lg font-black text-white">{issue.driver_name || `Пилот #${issue.driver_number}`}</div><div className="text-sm text-zinc-400">{issue.team_name} • {issue.type} • {issue.source}</div></div><span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${issue.severity === "high" ? "bg-red-500/15 text-red-300" : "bg-yellow-500/15 text-yellow-300"}`}>{issue.severity}</span></div><p className="mt-3 text-sm text-zinc-300">{issue.message}</p>{issue.lap_number && <p className="mt-2 text-xs text-zinc-500">Круг: {issue.lap_number}</p>}</div>) : <EmptyBlock title="Проблемных моментов не найдено" text="OpenF1 не вернул событий, которые анализатор мог бы отметить как проблемные." />}</section>;
}

function ChatTab({ chatInput, chatMessages, chatLoading, setChatInput, sendChatMessage }: any) {
  return <section className="rounded-3xl border border-white/10 bg-[#11131b] p-5"><h3 className="flex items-center gap-2 text-xl font-black text-white"><MessageSquare className="h-5 w-5 text-[#e10600]" /> GigaChat по гонке</h3><p className="mt-1 text-sm text-zinc-400">Можно спросить: “кто выиграл?”, “кто потерял позиции?”, “сравни двух пилотов”, “что значит DNF?”.</p><div className="mt-5 flex h-[420px] flex-col gap-3 overflow-y-auto rounded-2xl border border-white/10 bg-black/30 p-4">{chatMessages.length === 0 && <div className="text-sm text-zinc-500">Пока сообщений нет.</div>}{chatMessages.map((message: ChatMessage, index: number) => <div key={index} className={`max-w-[85%] rounded-2xl p-3 text-sm ${message.role === "user" ? "ml-auto bg-[#e10600] text-white" : "bg-white/[0.06] text-zinc-200"}`}>{message.text}</div>)}{chatLoading && <div className="max-w-[85%] rounded-2xl bg-white/[0.06] p-3 text-sm text-zinc-400">GigaChat думает...</div>}</div><div className="mt-4 flex gap-3"><input value={chatInput} onChange={(event) => setChatInput(event.target.value)} onKeyDown={(event) => event.key === "Enter" && sendChatMessage()} className="flex-1 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-[#e10600]" placeholder="Спроси что-нибудь про выбранную гонку..." /><button onClick={sendChatMessage} disabled={!chatInput.trim() || chatLoading} className="rounded-2xl bg-[#e10600] px-5 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50">Отправить</button></div></section>;
}

function DataTab({ race }: any) {
  return <section className="grid gap-6 lg:grid-cols-2"><div className="rounded-3xl border border-white/10 bg-[#11131b] p-5"><h3 className="flex items-center gap-2 text-xl font-black text-white"><Database className="h-5 w-5 text-[#e10600]" /> Доступность данных</h3><div className="mt-4 grid gap-2 text-sm">{Object.entries(race.data_quality || {}).map(([key, value]) => <div key={key} className="flex items-center justify-between rounded-2xl bg-white/[0.03] px-3 py-2"><span className="text-zinc-400">{key}</span><span className="font-bold text-white">{String(value)}</span></div>)}</div></div><div className="rounded-3xl border border-white/10 bg-[#11131b] p-5"><h3 className="flex items-center gap-2 text-xl font-black text-white"><CloudSun className="h-5 w-5 text-[#e10600]" /> Погода</h3>{race.weather?.length ? <div className="mt-4 h-80"><ResponsiveContainer width="100%" height="100%"><LineChart data={race.weather.map((item: any) => ({ time: new Date(item.date).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }), air: item.air_temperature, track: item.track_temperature, humidity: item.humidity }))}><CartesianGrid strokeDasharray="3 3" stroke="#27272a" /><XAxis dataKey="time" stroke="#a1a1aa" /><YAxis stroke="#a1a1aa" /><Tooltip contentStyle={{ background: "#11131b", border: "1px solid #333", borderRadius: 12 }} /><Legend /><Line type="monotone" dataKey="air" stroke="#60a5fa" dot={false} /><Line type="monotone" dataKey="track" stroke="#f97316" dot={false} /><Line type="monotone" dataKey="humidity" stroke="#22c55e" dot={false} /></LineChart></ResponsiveContainer></div> : <EmptyBlock title="Погода недоступна" text="OpenF1 не вернул weather для этой сессии." />}</div></section>;
}
