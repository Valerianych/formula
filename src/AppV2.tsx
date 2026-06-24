import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bot, Calendar, Database, Flag, GitCompare, Map as MapIcon, MessageSquare, RefreshCw, Timer, Trophy, UserRound, Wrench } from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import "./index.css";

type TabId = "overview" | "laps" | "pitstops" | "compare" | "map" | "chat" | "data";

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
  finish_time?: string | number | null;
  duration?: string | number | null;
  gap_to_leader?: string | number | null;
  status?: string | null;
  best_lap?: number | null;
  best_lap_text?: string | null;
  pit_stop_count?: number;
  dnf?: boolean;
  dns?: boolean;
  dsq?: boolean;
  positions?: any[];
  pit_stops?: any[];
};

type RaceData = {
  session: any;
  summary: any;
  drivers: Driver[];
  driver_summaries: Driver[];
  laps: any[];
  pit_stops: any[];
  positions: any[];
  track_map?: { points?: any[]; note?: string; source_driver_name?: string };
  issues: any[];
  data_quality: Record<string, any>;
};

type ChatMessage = { role: "user" | "assistant"; text: string; provider?: string };

const YEARS = [2026, 2025, 2024, 2023];
const TABS: Array<{ id: TabId; title: string; icon: any }> = [
  { id: "overview", title: "Итог", icon: Trophy },
  { id: "laps", title: "Круги", icon: Timer },
  { id: "pitstops", title: "Пит-стопы", icon: Wrench },
  { id: "compare", title: "Сравнение", icon: GitCompare },
  { id: "map", title: "Карта", icon: MapIcon },
  { id: "chat", title: "ИИ-чат", icon: Bot },
  { id: "data", title: "Данные", icon: Database },
];

function teamColor(value?: string) {
  if (!value) return "#e10600";
  return value.startsWith("#") ? value : `#${value}`;
}

function empty(value: any) {
  return value === null || value === undefined || value === "" || value === "null" || value === "—";
}

function parseDuration(value: any): number | null {
  if (empty(value)) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const raw = String(value).trim();
  if (/finished|финишировал|winner|победитель/i.test(raw)) return null;
  const text = raw.startsWith("+") ? raw.slice(1) : raw;
  const parts = text.split(":").map(Number);
  if (parts.some((part) => !Number.isFinite(part))) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0];
  return null;
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = (seconds % 60).toFixed(3).padStart(6, "0");
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${s}`;
  return `${m}:${s}`;
}

function formatGap(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "—";
  return seconds >= 60 ? `+${formatDuration(seconds)}` : `+${seconds.toFixed(3)}`;
}

function winnerSeconds(race: RaceData | null) {
  const winner = race?.drivers?.find((driver) => Number(driver.finishing_position) === 1) || race?.summary?.winner;
  return parseDuration(winner?.finish_time ?? winner?.duration ?? winner?.gap_to_leader);
}

function finishDisplay(driver: Driver, race: RaceData | null) {
  const raw = driver.finish_time ?? driver.duration ?? driver.gap_to_leader ?? driver.status;
  if (empty(raw)) return "—";
  const place = Number(driver.finishing_position);
  const seconds = parseDuration(raw);
  const win = winnerSeconds(race);
  const rawText = String(raw).trim();

  if (place > 1) {
    if (rawText.startsWith("+")) return rawText;
    if (seconds !== null && win !== null && seconds > win + 1) return formatGap(seconds - win);
    if (seconds !== null && seconds < 600) return formatGap(seconds);
    if (/finished|финишировал/i.test(rawText)) return "Финишировал";
  }

  if (seconds !== null) return formatDuration(seconds);
  return rawText === "Finished" ? "Финишировал" : rawText;
}

function lapDisplay(value: any) {
  const seconds = parseDuration(value);
  return seconds === null ? "—" : formatDuration(seconds);
}

function bestLapDisplay(driver: any) {
  return driver?.best_lap_text || lapDisplay(driver?.best_lap);
}

function statusDisplay(driver: Driver) {
  if (driver.dsq) return "DSQ";
  if (driver.dns) return "DNS";
  if (driver.dnf) return driver.status && !/^\+?\d/.test(driver.status) ? driver.status : "DNF";
  if (!driver.status || /^\+?\d/.test(driver.status)) return "Финишировал";
  return driver.status === "Finished" ? "Финишировал" : driver.status;
}

function pos(value: any) {
  return Number.isFinite(Number(value)) ? String(value) : "—";
}

function dateText(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleString("ru-RU", { dateStyle: "medium", timeStyle: "short" });
}

async function apiJson(url: string, options?: RequestInit) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.success === false) throw new Error(payload?.error || `HTTP ${response.status}`);
  return payload;
}

function StatCard({ label, value, hint }: { label: string; value: any; hint?: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#151720] p-5">
      <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500">{label}</div>
      <div className="mt-2 text-2xl font-black text-white">{empty(value) ? "—" : value}</div>
      {hint && <div className="mt-1 text-xs text-zinc-500">{hint}</div>}
    </div>
  );
}

function Notice({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-sm text-zinc-300">
      <div className="font-black text-white">{title}</div>
      <p className="mt-1 text-zinc-400">{text}</p>
    </div>
  );
}

export default function App() {
  const [year, setYear] = useState(2025);
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionKey, setSessionKey] = useState<number | "">("");
  const [race, setRace] = useState<RaceData | null>(null);
  const [tab, setTab] = useState<TabId>("overview");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedDriver, setSelectedDriver] = useState<number | "">("");
  const [compareA, setCompareA] = useState<number | "">("");
  const [compareB, setCompareB] = useState<number | "">("");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    loadSessions(year);
  }, [year]);

  useEffect(() => {
    if (sessionKey) loadRace(Number(sessionKey));
  }, [sessionKey]);

  async function loadSessions(nextYear: number) {
    setLoading(true);
    setError("");
    setRace(null);
    try {
      const payload = await apiJson(`/api/sessions?year=${nextYear}`);
      const list = payload.sessions || [];
      setSessions(list);
      setSessionKey(list[0]?.session_key || "");
      if (!list.length) setError("За этот год API не вернул гонки.");
    } catch (err: any) {
      setError(err.message || "Не удалось загрузить список гонок.");
    } finally {
      setLoading(false);
    }
  }

  async function loadRace(key: number) {
    setLoading(true);
    setError("");
    try {
      const payload = await apiJson(`/api/race-dashboard?session_key=${key}`);
      const data: RaceData = payload.data;
      setRace(data);
      const first = data.summary?.winner?.driver_number || data.drivers?.[0]?.driver_number || "";
      const second = data.drivers?.find((driver) => driver.driver_number !== first)?.driver_number || "";
      setSelectedDriver(first);
      setCompareA(first);
      setCompareB(second);
      setChatMessages([]);
    } catch (err: any) {
      setError(err.message || "Не удалось загрузить гонку.");
    } finally {
      setLoading(false);
    }
  }

  async function sendChat(override?: string) {
    const text = (override || chatInput).trim();
    if (!text || !race || chatLoading) return;
    const nextMessages: ChatMessage[] = [...chatMessages, { role: "user", text }];
    setChatMessages(nextMessages);
    setChatInput("");
    setChatLoading(true);
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
            driver_summaries: race.driver_summaries || race.drivers,
            data_quality: race.data_quality,
          },
        }),
      });
      setChatMessages([...nextMessages, { role: "assistant", text: payload.answer || payload.analysis || "ИИ не вернул ответ.", provider: payload.provider }]);
    } catch (err: any) {
      setChatMessages([...nextMessages, { role: "assistant", text: `ИИ-чат недоступен: ${err.message || "ошибка"}` }]);
    } finally {
      setChatLoading(false);
    }
  }

  const drivers = race?.driver_summaries?.length ? race.driver_summaries : race?.drivers || [];
  const winner = race?.summary?.winner || drivers.find((driver) => Number(driver.finishing_position) === 1);
  const chosenDriver = drivers.find((driver) => driver.driver_number === Number(selectedDriver));
  const driverLaps = race?.laps?.filter((lap) => lap.driver_number === Number(selectedDriver) && lap.lap_duration).map((lap) => ({ lap: lap.lap_number, time: Number(lap.lap_duration.toFixed?.(3) || lap.lap_duration), position: lap.position })) || [];

  return (
    <div className="min-h-screen bg-[#08090d] text-zinc-100">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#11131b]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#e10600] text-xl font-black italic">F1</div>
            <div>
              <h1 className="text-xl font-black uppercase">F1 Race Analytics</h1>
              <p className="text-xs text-zinc-400">OpenF1 + Jolpica API</p>
            </div>
          </div>
          <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-black/30 p-1">
            {TABS.map((item) => {
              const Icon = item.icon;
              return <button key={item.id} onClick={() => setTab(item.id)} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold ${tab === item.id ? "bg-[#e10600] text-white" : "text-zinc-400 hover:bg-white/5"}`}><Icon className="h-4 w-4" />{item.title}</button>;
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6">
        <section className="grid gap-4 rounded-3xl border border-white/10 bg-[#11131b] p-5 lg:grid-cols-[220px_1fr_auto] lg:items-end">
          <div>
            <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500"><Calendar className="h-4 w-4 text-[#e10600]" />Сезон</label>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm font-bold outline-none focus:border-[#e10600]">
              {YEARS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500"><Flag className="h-4 w-4 text-[#e10600]" />Гонка</label>
            <select value={sessionKey} onChange={(e) => setSessionKey(e.target.value ? Number(e.target.value) : "")} className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm font-bold outline-none focus:border-[#e10600]">
              {sessions.map((session) => <option key={session.session_key} value={session.session_key}>{session.meeting_name} — {session.location} — {dateText(session.date_start)}</option>)}
            </select>
          </div>
          <button onClick={() => sessionKey && loadRace(Number(sessionKey))} disabled={!sessionKey || loading} className="flex h-[46px] items-center justify-center gap-2 rounded-2xl bg-[#e10600] px-5 text-xs font-black uppercase tracking-widest disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Обновить</button>
        </section>

        {error && <div className="rounded-2xl border border-red-500/30 bg-red-950/30 p-4 text-sm text-red-100"><AlertTriangle className="mr-2 inline h-5 w-5" />{error}</div>}
        {loading && <div className="rounded-3xl border border-white/10 bg-[#11131b] p-8 text-center text-zinc-400"><RefreshCw className="mx-auto mb-3 h-8 w-8 animate-spin text-[#e10600]" />Загрузка данных...</div>}

        {race && !loading && (
          <>
            <section className="grid gap-4 lg:grid-cols-4">
              <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#191b26] to-[#101119] p-5 lg:col-span-2">
                <div className="text-xs font-black uppercase tracking-[0.25em] text-[#e10600]">Race</div>
                <h2 className="mt-2 text-3xl font-black">{race.session.meeting_name}</h2>
                <p className="mt-2 text-sm text-zinc-400">{race.session.location}, {race.session.country_name} • {dateText(race.session.date_start)}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
                  <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-300">API-данные</span>
                  <span className="rounded-full bg-white/5 px-3 py-1 text-zinc-300">кругов: {race.laps?.length || 0}</span>
                  <span className="rounded-full bg-white/5 px-3 py-1 text-zinc-300">питов: {race.pit_stops?.length || 0}</span>
                </div>
              </div>
              <StatCard label="Победитель" value={winner?.full_name || "—"} hint={winner?.team_name} />
              <StatCard label="Пилотов" value={drivers.length} hint={`DNF: ${race.summary?.dnf_count || 0}`} />
            </section>

            {tab === "overview" && <Overview race={race} drivers={drivers} setTab={setTab} setSelectedDriver={setSelectedDriver} />}
            {tab === "laps" && <Laps race={race} drivers={drivers} selectedDriver={selectedDriver} setSelectedDriver={setSelectedDriver} driverLaps={driverLaps} />}
            {tab === "pitstops" && <PitStops race={race} drivers={drivers} />}
            {tab === "compare" && <Compare race={race} drivers={drivers} compareA={compareA} compareB={compareB} setCompareA={setCompareA} setCompareB={setCompareB} />}
            {tab === "map" && <MapOrPositions race={race} drivers={drivers} />}
            {tab === "chat" && <Chat chatInput={chatInput} setChatInput={setChatInput} chatMessages={chatMessages} chatLoading={chatLoading} sendChat={sendChat} />}
            {tab === "data" && <DataPanel race={race} />}
          </>
        )}
      </main>
    </div>
  );
}

function Overview({ race, drivers, setTab, setSelectedDriver }: any) {
  const top3 = race.summary?.top3 || drivers.slice(0, 3);
  return (
    <section className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        {top3.map((driver: Driver, index: number) => <div key={driver.driver_number} className="rounded-3xl border border-white/10 bg-[#151720] p-5"><div className="text-xs font-black uppercase tracking-[0.25em] text-[#e10600]">{index + 1} место</div><div className="mt-4 flex items-center gap-4"><img src={driver.headshot_url || ""} className="h-16 w-16 rounded-2xl bg-black/40 object-cover" /><div><div className="text-xl font-black">{driver.full_name}</div><div style={{ color: teamColor(driver.team_colour) }} className="text-sm font-bold">{driver.team_name}</div><div className="mt-1 text-xs text-zinc-500">{finishDisplay(driver, race)} • лучший круг: {bestLapDisplay(driver)}</div></div></div></div>)}
      </div>
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#11131b]">
        <div className="border-b border-white/10 p-5"><h3 className="text-xl font-black">Итог гонки</h3><p className="mt-1 text-sm text-zinc-400">победитель — полное время, остальные — отставание.</p></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="bg-black/30 text-xs uppercase tracking-widest text-zinc-500"><tr><th className="px-4 py-3">Место</th><th className="px-4 py-3">Пилот</th><th className="px-4 py-3">Команда</th><th className="px-4 py-3">Старт</th><th className="px-4 py-3">Финиш</th><th className="px-4 py-3">Лучший круг</th><th className="px-4 py-3">Круги</th><th className="px-4 py-3">Пит-стопы</th><th className="px-4 py-3">Статус</th></tr></thead><tbody>{drivers.map((driver: Driver) => <tr key={driver.driver_number} className="border-t border-white/5 hover:bg-white/[0.03]"><td className="px-4 py-3 font-black">{pos(driver.finishing_position)}</td><td className="px-4 py-3"><button onClick={() => { setSelectedDriver(driver.driver_number); setTab("laps"); }} className="flex items-center gap-3 text-left"><img src={driver.headshot_url || ""} className="h-10 w-10 rounded-xl bg-black/40 object-cover" /><span><span className="block font-bold">{driver.full_name}</span><span className="text-xs text-zinc-500">#{driver.driver_number} • {driver.name_acronym}</span></span></button></td><td className="px-4 py-3 font-bold" style={{ color: teamColor(driver.team_colour) }}>{driver.team_name}</td><td className="px-4 py-3">{pos(driver.starting_position)}</td><td className="px-4 py-3 font-bold text-white">{finishDisplay(driver, race)}</td><td className="px-4 py-3">{bestLapDisplay(driver)}</td><td className="px-4 py-3">{pos(driver.classified_laps)}</td><td className="px-4 py-3">{driver.pit_stop_count ?? driver.pit_stops?.length ?? 0}</td><td className="px-4 py-3 text-xs text-zinc-400">{statusDisplay(driver)}</td></tr>)}</tbody></table></div>
      </div>
    </section>
  );
}

function Laps({ race, drivers, selectedDriver, setSelectedDriver, driverLaps }: any) {
  return <section className="grid gap-6 lg:grid-cols-[280px_1fr]"><div className="rounded-3xl border border-white/10 bg-[#11131b] p-5"><label className="mb-2 block text-xs font-bold uppercase tracking-widest text-zinc-500">Пилот</label><select value={selectedDriver} onChange={(e) => setSelectedDriver(Number(e.target.value))} className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm font-bold outline-none">{drivers.map((driver: Driver) => <option key={driver.driver_number} value={driver.driver_number}>{driver.full_name}</option>)}</select><p className="mt-4 text-sm text-zinc-400">Круги берутся из Jolpica lap timings. Это не телеметрия по секторам, но для графиков и сравнения хватает.</p></div><div className="rounded-3xl border border-white/10 bg-[#11131b] p-5"><h3 className="text-xl font-black">Время кругов</h3>{driverLaps.length ? <div className="mt-4 h-96"><ResponsiveContainer width="100%" height="100%"><LineChart data={driverLaps}><CartesianGrid strokeDasharray="3 3" stroke="#27272a" /><XAxis dataKey="lap" stroke="#a1a1aa" /><YAxis stroke="#a1a1aa" domain={["dataMin - 1", "dataMax + 1"]} /><Tooltip contentStyle={{ background: "#11131b", border: "1px solid #333", borderRadius: 12 }} /><Line dataKey="time" dot={false} stroke="#e10600" strokeWidth={2} /></LineChart></ResponsiveContainer></div> : <Notice title="Круги недоступны" text="API не вернул lap timings по этой гонке. Выбери гонку, где cache:site показал laps больше 0." />}</div></section>;
}

function PitStops({ race, drivers }: any) {
  const byNumber = new Map(drivers.map((driver: Driver) => [driver.driver_number, driver]));
  return <section className="rounded-3xl border border-white/10 bg-[#11131b] p-5"><h3 className="text-xl font-black">Пит-стопы</h3>{race.pit_stops?.length ? <div className="mt-4 grid gap-2">{race.pit_stops.map((pit: any, index: number) => { const driver: any = byNumber.get(pit.driver_number); return <div key={index} className="grid gap-2 rounded-2xl bg-white/[0.03] p-3 text-sm md:grid-cols-4"><div className="font-bold">{driver?.full_name || `#${pit.driver_number}`}</div><div>Круг: {pos(pit.lap_number)}</div><div>Остановка: {pit.stop_duration ? `${pit.stop_duration} c` : "—"}</div><div className="text-zinc-500">№ {pit.stop_number ?? index + 1}</div></div>; })}</div> : <Notice title="Пит-стопы недоступны" text="API не вернул pitstops для этой гонки." />}</section>;
}

function Compare({ race, drivers, compareA, compareB, setCompareA, setCompareB }: any) {
  const a = drivers.find((driver: Driver) => driver.driver_number === Number(compareA));
  const b = drivers.find((driver: Driver) => driver.driver_number === Number(compareB));
  const chart = useMemo(() => {
    if (!race || !a || !b) return [];
    const lapsA = race.laps.filter((lap: any) => lap.driver_number === a.driver_number && lap.lap_duration);
    const lapsB = race.laps.filter((lap: any) => lap.driver_number === b.driver_number && lap.lap_duration);
    const nums = Array.from(new Set([...lapsA.map((lap: any) => lap.lap_number), ...lapsB.map((lap: any) => lap.lap_number)])).sort((x: any, y: any) => x - y);
    return nums.map((lap: any) => ({ lap, [a.name_acronym || "A"]: lapsA.find((x: any) => x.lap_number === lap)?.lap_duration || null, [b.name_acronym || "B"]: lapsB.find((x: any) => x.lap_number === lap)?.lap_duration || null }));
  }, [race, a, b]);
  return <section className="grid gap-6"><div className="grid gap-4 md:grid-cols-2"><select value={compareA} onChange={(e) => setCompareA(Number(e.target.value))} className="rounded-2xl border border-white/10 bg-[#11131b] px-4 py-3 font-bold">{drivers.map((driver: Driver) => <option key={driver.driver_number} value={driver.driver_number}>{driver.full_name}</option>)}</select><select value={compareB} onChange={(e) => setCompareB(Number(e.target.value))} className="rounded-2xl border border-white/10 bg-[#11131b] px-4 py-3 font-bold">{drivers.map((driver: Driver) => <option key={driver.driver_number} value={driver.driver_number}>{driver.full_name}</option>)}</select></div>{a && b && <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#11131b]"><table className="w-full text-left text-sm"><tbody>{[["Финиш", pos(a.finishing_position), pos(b.finishing_position)], ["Старт", pos(a.starting_position), pos(b.starting_position)], ["Время", finishDisplay(a, race), finishDisplay(b, race)], ["Лучший круг", bestLapDisplay(a), bestLapDisplay(b)], ["Пит-стопы", a.pit_stop_count ?? 0, b.pit_stop_count ?? 0]].map((row) => <tr key={row[0]} className="border-t border-white/5"><td className="px-4 py-3 text-zinc-400">{row[0]}</td><td className="px-4 py-3 font-bold">{row[1]}</td><td className="px-4 py-3 font-bold">{row[2]}</td></tr>)}</tbody></table></div>}{chart.length ? <div className="h-96 rounded-3xl border border-white/10 bg-[#11131b] p-5"><ResponsiveContainer width="100%" height="100%"><LineChart data={chart}><CartesianGrid strokeDasharray="3 3" stroke="#27272a" /><XAxis dataKey="lap" stroke="#a1a1aa" /><YAxis stroke="#a1a1aa" domain={["dataMin - 1", "dataMax + 1"]} /><Tooltip contentStyle={{ background: "#11131b", border: "1px solid #333", borderRadius: 12 }} /><Legend /><Line dataKey={a?.name_acronym || "A"} dot={false} stroke="#e10600" /><Line dataKey={b?.name_acronym || "B"} dot={false} stroke="#60a5fa" /></LineChart></ResponsiveContainer></div> : <Notice title="График сравнения недоступен" text="Для этой гонки нет lap timings." />}</section>;
}

function MapOrPositions({ race, drivers }: any) {
  if (race.track_map?.points?.length) return <section className="rounded-3xl border border-white/10 bg-[#11131b] p-5"><h3 className="text-xl font-black">Карта трассы</h3><svg viewBox="0 0 100 100" className="mt-4 h-[520px] w-full rounded-3xl bg-black p-4"><polyline points={race.track_map.points.map((p: any) => `${p.x},${p.y}`).join(" ")} fill="none" stroke="#e10600" strokeWidth="0.65" /></svg></section>;
  const topDrivers = drivers.slice(0, 5);
  const chart = race.positions?.filter((p: any) => topDrivers.some((d: any) => d.driver_number === p.driver_number)).map((p: any) => ({ lap: p.lap_number, [`#${p.driver_number}`]: p.position })) || [];
  return <section className="rounded-3xl border border-white/10 bg-[#11131b] p-5"><h3 className="text-xl font-black">Карта / позиции</h3><p className="mt-1 text-sm text-zinc-400">Jolpica не отдаёт x/y координаты трассы. Вместо карты показываем позиции по кругам — это реальные API-данные.</p>{chart.length ? <div className="mt-4 h-96"><ResponsiveContainer width="100%" height="100%"><LineChart data={chart}><CartesianGrid strokeDasharray="3 3" stroke="#27272a" /><XAxis dataKey="lap" stroke="#a1a1aa" /><YAxis stroke="#a1a1aa" reversed stroke="#a1a1aa" /><Tooltip contentStyle={{ background: "#11131b", border: "1px solid #333", borderRadius: 12 }} />{topDrivers.map((driver: any) => <Line key={driver.driver_number} dataKey={`#${driver.driver_number}`} dot={false} stroke={teamColor(driver.team_colour)} />)}</LineChart></ResponsiveContainer></div> : <Notice title="Нет данных для карты" text="Координаты трассы доступны только через telemetry/position источники. Сейчас они не вернулись." />}</section>;
}

function DataPanel({ race }: any) {
  const groups = [
    ["Итог гонки", race.data_quality?.has_session_result],
    ["Пилоты", race.data_quality?.has_drivers],
    ["Финишное время", race.data_quality?.has_finish_times],
    ["Круги", race.data_quality?.has_laps],
    ["Позиции по кругам", race.data_quality?.has_positions],
    ["Пит-стопы", race.data_quality?.has_pit_stops],
    ["Карта x/y", race.data_quality?.has_location],
  ];
  return <section className="grid gap-6 lg:grid-cols-2"><div className="rounded-3xl border border-white/10 bg-[#11131b] p-5"><h3 className="text-xl font-black">Что реально получено</h3><div className="mt-4 grid gap-2">{groups.map(([name, ok]: any) => <div key={name} className="flex items-center justify-between rounded-2xl bg-white/[0.03] px-4 py-3"><span>{name}</span><span className={ok ? "text-emerald-300" : "text-zinc-500"}>{ok ? "есть" : "нет в источнике"}</span></div>)}</div></div><Notice title="Почему не всё есть" text="Сайт теперь не пытается делать вид, что все API отдают всё. Jolpica даёт результат, круги, позиции и питы; OpenF1 даёт сессии и иногда дополнительные live-данные; x/y карта зависит от telemetry, которой у тебя источник часто не отдаёт." /></section>;
}

function Chat({ chatInput, setChatInput, chatMessages, chatLoading, sendChat }: any) {
  const quick = ["Кто выиграл?", "Покажи топ-3", "У кого лучший круг?", "Кто потерял позиции?"];
  return <section className="rounded-3xl border border-white/10 bg-[#11131b] p-5"><h3 className="flex items-center gap-2 text-xl font-black"><MessageSquare className="h-5 w-5 text-[#e10600]" />ИИ-чат</h3><div className="mt-4 flex flex-wrap gap-2">{quick.map((q) => <button key={q} onClick={() => sendChat(q)} className="rounded-full bg-white/[0.05] px-3 py-2 text-xs font-bold">{q}</button>)}</div><div className="mt-4 flex h-[420px] flex-col gap-3 overflow-y-auto rounded-2xl border border-white/10 bg-black/30 p-4">{chatMessages.length === 0 && <div className="text-sm text-zinc-500">Спроси что-нибудь по выбранной гонке.</div>}{chatMessages.map((m: ChatMessage, i: number) => <div key={i} className={`max-w-[85%] whitespace-pre-line rounded-2xl p-3 text-sm ${m.role === "user" ? "ml-auto bg-[#e10600]" : "bg-white/[0.06]"}`}>{m.text}</div>)}{chatLoading && <div className="rounded-2xl bg-white/[0.06] p-3 text-sm text-zinc-400">ИИ думает...</div>}</div><div className="mt-4 flex gap-3"><input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendChat()} className="flex-1 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 outline-none" placeholder="Спроси про гонку..." /><button onClick={() => sendChat()} className="rounded-2xl bg-[#e10600] px-5 text-xs font-black uppercase">Отправить</button></div></section>;
}
