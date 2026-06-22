import fs from 'node:fs';
import path from 'node:path';

const year = Number(process.argv[2] || 0);
const dir = path.join(process.cwd(), 'data', 'openf1-cache', 'race-dashboard');
const bad = (v:any) => v === null || v === undefined || v === '' || v === 'null';
const keys = ['starting_position','finishing_position','classified_laps','best_lap','average_lap','median_lap','average_pit_stop'];

function dataOf(x:any){ return x?.data ?? x; }
function wrap(old:any,d:any){ return old && 'data' in old ? {...old,data:d} : {savedAt:new Date().toISOString(),url:null,data:d}; }
function sec(v:any):number|null{
  if (bad(v)) return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const s = String(v).trim();
  if (!s || s === '—' || s.startsWith('+')) return null;
  const p = s.split(':').map(Number);
  if (p.some(n=>!Number.isFinite(n))) return null;
  if (p.length === 3) return p[0]*3600+p[1]*60+p[2];
  if (p.length === 2) return p[0]*60+p[1];
  if (p.length === 1) return p[0];
  return null;
}
function fmt(t:number){
  const h=Math.floor(t/3600), m=Math.floor((t%3600)/60), s=(t%60).toFixed(3).padStart(6,'0');
  return h ? `${h}:${String(m).padStart(2,'0')}:${s}` : `${m}:${s}`;
}
function gap(t:number){ return t >= 60 ? `+${fmt(t)}` : `+${t.toFixed(3)}`; }
function cleanDriver(d:any, win:number|null){
  for (const k of keys) if (bad(d?.[k])) delete d[k];
  const t = sec(d.finish_time ?? d.duration ?? d.gap_to_leader);
  if (t !== null) {
    const pos = Number(d.finishing_position);
    const out = win !== null && pos > 1 && t > win ? gap(t-win) : fmt(t);
    d.finish_time = out; d.duration = out; d.gap_to_leader = out;
  }
  if (!d.status || d.status === 'null') d.status = d.dnf ? 'DNF' : 'Финишировал';
  return d;
}
function repair(d:any){
  d.drivers = Array.isArray(d.drivers) ? d.drivers : [];
  const w = d.drivers.find((x:any)=>Number(x.finishing_position)===1) || d.summary?.winner || d.drivers[0];
  const win = sec(w?.finish_time ?? w?.duration ?? w?.gap_to_leader);
  d.drivers = d.drivers.map((x:any)=>cleanDriver(x,win));
  d.driver_summaries = Array.isArray(d.driver_summaries) ? d.driver_summaries.map((x:any)=>cleanDriver(x,win)) : d.drivers;
  const top3 = [...d.drivers].filter((x:any)=>Number.isFinite(Number(x.finishing_position))).sort((a:any,b:any)=>Number(a.finishing_position)-Number(b.finishing_position)).slice(0,3);
  d.summary = d.summary || {}; d.summary.winner = top3[0] || d.summary.winner || null; d.summary.top3 = top3; d.summary.total_drivers = d.drivers.length;
  d.data_quality = d.data_quality || {};
  d.data_quality.has_session_result = d.drivers.some((x:any)=>Number.isFinite(Number(x.finishing_position)));
  d.data_quality.has_laps = Array.isArray(d.laps) && d.laps.some((x:any)=>x.lap_duration);
  d.data_quality.has_pit_stops = Array.isArray(d.pit_stops) && d.pit_stops.length > 0;
  d.data_quality.has_stints = Array.isArray(d.stints) && d.stints.length > 0;
  d.data_quality.has_location = Boolean(d.track_map?.points?.length);
  d.data_quality.has_finish_times = d.drivers.some((x:any)=>x.finish_time && x.finish_time !== '—');
  d.data_quality.note = 'Кэш нормализован: null убран, время гонки приведено к виду 1:26:07.469 / +12.594.';
  return d;
}
if (!fs.existsSync(dir)) { console.log('Нет папки кэша: '+dir); process.exit(0); }
let n=0;
for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith('.json')) continue;
  const p=path.join(dir,f), old=JSON.parse(fs.readFileSync(p,'utf8')), d=dataOf(old);
  if (year && Number(d?.session?.year) !== year) continue;
  fs.writeFileSync(p, JSON.stringify(wrap(old, repair(d)), null, 2)); n++;
}
console.log(`Исправлено файлов кэша: ${n}`);
