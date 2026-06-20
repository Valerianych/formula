import { randomUUID } from "node:crypto";
import { GoogleGenAI } from "@google/genai";

let gigaChatTokenCache: { token: string; expiresAt: number } | null = null;

function enableGigaChatTlsFallback() {
  if (process.env.GIGACHAT_IGNORE_TLS_ERRORS !== "false") {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  }
}

function displayTime(value: any) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string") return value;
  const sec = Number(value);
  if (!Number.isFinite(sec) || sec <= 0) return String(value);
  const mins = Math.floor(sec / 60);
  const remainingSecs = (sec % 60).toFixed(3).padStart(6, "0");
  return mins > 0 ? `${mins}:${remainingSecs}` : `${remainingSecs}с`;
}

function bestLap(driver: any) {
  return driver?.best_lap_text || displayTime(driver?.best_lap);
}

function finishTime(driver: any) {
  return displayTime(driver?.finish_time ?? driver?.duration ?? driver?.gap_to_leader ?? driver?.status);
}

function safeSliceJson(value: any, maxLength = 14_000) {
  const text = JSON.stringify(value, null, 2);
  return text.length <= maxLength ? text : `${text.slice(0, maxLength)}\n...контекст обрезан...`;
}

function getGigaAuthKey() {
  return process.env.GIGACHAT_AUTH_KEY || process.env.GIGACHAT_CREDENTIALS || "";
}

async function getGigaChatAccessToken() {
  if (process.env.GIGACHAT_ACCESS_TOKEN) return process.env.GIGACHAT_ACCESS_TOKEN;
  if (gigaChatTokenCache && Date.now() < gigaChatTokenCache.expiresAt - 60_000) return gigaChatTokenCache.token;

  const authorizationKey = getGigaAuthKey();
  if (!authorizationKey) return null;
  enableGigaChatTlsFallback();

  const response = await fetch(process.env.GIGACHAT_OAUTH_URL || "https://ngw.devices.sberbank.ru:9443/api/v2/oauth", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      RqUID: randomUUID(),
      Authorization: `Basic ${authorizationKey}`,
    },
    body: new URLSearchParams({ scope: process.env.GIGACHAT_SCOPE || "GIGACHAT_API_PERS" }),
  });

  if (!response.ok) throw new Error(`GigaChat OAuth returned ${response.status}`);
  const payload = await response.json();
  if (!payload?.access_token) throw new Error("GigaChat OAuth did not return access_token");

  gigaChatTokenCache = {
    token: payload.access_token,
    expiresAt: payload.expires_at ? Number(payload.expires_at) : Date.now() + 25 * 60_000,
  };
  return gigaChatTokenCache.token;
}

async function generateWithGigaChat(prompt: string, chatMessages: Array<{ role: string; content?: string; text?: string }> = []) {
  const token = await getGigaChatAccessToken();
  if (!token) return null;
  enableGigaChatTlsFallback();

  const history = chatMessages
    .filter((message) => ["user", "assistant"].includes(message.role))
    .slice(-8)
    .map((message) => ({ role: message.role, content: String(message.content || message.text || "").slice(0, 1800) }));

  const response = await fetch(`${process.env.GIGACHAT_API_BASE || "https://gigachat.devices.sberbank.ru/api/v1"}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      model: process.env.GIGACHAT_MODEL || "GigaChat",
      messages: [
        {
          role: "system",
          content: "Ты русскоязычный помощник по Формуле-1 внутри сайта аналитики гонок. Отвечай по выбранной гонке в целом: победитель, топ-3, финишное время, лучший круг, сходы, сравнение пилотов. Не привязывайся к одному пилоту, если пользователь сам его не назвал. Не выдумывай факты. Если данных нет в контексте, прямо скажи, что данных нет. Объясняй простым языком.",
        },
        ...history,
        { role: "user", content: prompt },
      ],
      temperature: 0.25,
    }),
  });

  if (!response.ok) throw new Error(`GigaChat API returned ${response.status}`);
  const payload = await response.json();
  return payload?.choices?.[0]?.message?.content || null;
}

function buildCompactContext(body: any) {
  if (body.raceContext) return body.raceContext;
  const { session, driver, laps, weather, events, issues, summary } = body;
  const validLaps = Array.isArray(laps) ? laps.filter((lap: any) => lap.lap_duration && lap.lap_duration > 0) : [];
  const lapTimes = validLaps.map((lap: any) => lap.lap_duration);
  const bestLapValue = lapTimes.length ? Math.min(...lapTimes) : null;
  const avgLap = lapTimes.length ? lapTimes.reduce((sum: number, value: number) => sum + value, 0) / lapTimes.length : null;
  return {
    session,
    selected_driver: driver,
    summary,
    driver_stats: driver ? { best_lap: bestLapValue, average_lap: avgLap, laps_with_time: validLaps.length } : null,
    weather_latest: Array.isArray(weather) && weather.length ? weather[weather.length - 1] : null,
    race_control_events_count: Array.isArray(events) ? events.length : 0,
    race_control_events: Array.isArray(events) ? events.slice(0, 20) : [],
    issues: Array.isArray(issues) ? issues.slice(0, 30) : [],
  };
}

function topDriversText(drivers: any[], count = 5) {
  const ranked = drivers
    .filter((driver: any) => Number.isFinite(Number(driver.finishing_position)))
    .sort((a: any, b: any) => Number(a.finishing_position) - Number(b.finishing_position))
    .slice(0, count);
  if (!ranked.length) return "Нет таблицы финиша.";
  return ranked.map((driver: any) => `${driver.finishing_position}. ${driver.full_name} (${driver.team_name || "—"}) — финиш: ${finishTime(driver)}, лучший круг: ${bestLap(driver)}`).join("\n");
}

function buildFallbackAnswer(context: any, question: string, reason: string) {
  const q = question.toLowerCase();
  const session = context.session || {};
  const summary = context.summary || {};
  const top3 = summary.top3 || context.top3 || [];
  const issues = Array.isArray(context.issues) ? context.issues : [];
  const drivers = Array.isArray(context.driver_summaries) ? context.driver_summaries : [];
  const weather = context.weather_latest || summary.weather_latest;
  const dataQuality = context.data_quality || {};
  const prefix = reason ? `GigaChat сейчас не отвечает: ${reason}\nПоказываю ответ по данным сайта.\n\n` : "";

  if (/^(привет|здрав|hi|hello|ты кто)/i.test(q)) {
    return `${prefix}Я чат по выбранной гонке ${session.meeting_name || "F1"}. Могу объяснить итог, показать топ-3, финишное время, лучший круг, сходы и проблемные моменты. Сейчас в данных: пилотов ${summary.total_drivers ?? drivers.length ?? 0}, кругов ${summary.total_laps_with_times ?? 0}.`;
  }

  if (q.includes("топ") || q.includes("top") || q.includes("финиш")) {
    return `${prefix}Топ финиша:\n${topDriversText(drivers.length ? drivers : top3, 10)}`;
  }

  if (q.includes("кто выиг") || q.includes("побед")) {
    const winner = summary.winner || top3[0] || drivers.find((driver: any) => Number(driver.finishing_position) === 1);
    return `${prefix}${winner?.full_name ? `Победитель гонки: ${winner.full_name}${winner.team_name ? ` (${winner.team_name})` : ""}. Финишное время/статус: ${finishTime(winner)}.` : "Победитель не определён: API не вернул итоговую таблицу по этой гонке."}`;
  }

  if (q.includes("лучший круг") || q.includes("быстр") || q.includes("fastest")) {
    const sorted = drivers
      .filter((driver: any) => driver.best_lap_text || Number.isFinite(Number(driver.best_lap)))
      .sort((a: any, b: any) => (Number(a.fastest_lap_rank) || 99) - (Number(b.fastest_lap_rank) || 99));
    if (!sorted.length) return `${prefix}Лучшие круги недоступны: OpenF1/Jolpica не вернули fastest lap для этой гонки.`;
    return `${prefix}Лучшие круги:\n${sorted.slice(0, 8).map((driver: any, index: number) => `${index + 1}. ${driver.full_name} — ${bestLap(driver)}${driver.fastest_lap_lap ? `, круг ${driver.fastest_lap_lap}` : ""}`).join("\n")}`;
  }

  if (q.includes("сош") || q.includes("dnf") || q.includes("не финиш")) {
    const dnf = drivers.filter((driver: any) => driver.dnf || driver.dsq || driver.dns);
    if (!dnf.length) return `${prefix}В данных сайта нет отмеченных сходов DNF/DNS/DSQ по этой гонке.`;
    return `${prefix}Пилоты без нормального финиша:\n${dnf.map((driver: any) => `${driver.full_name} — ${driver.status || (driver.dsq ? "DSQ" : driver.dns ? "DNS" : "DNF")}`).join("\n")}`;
  }

  if (q.includes("косяч") || q.includes("ошиб") || q.includes("проблем") || q.includes("штраф")) {
    if (!issues.length) return `${prefix}По этой гонке анализатор не нашёл проблемных моментов. Это не значит, что ошибок вообще не было: просто Race Control/подробная телеметрия могли быть недоступны.`;
    return `${prefix}Проблемные моменты по данным API:\n${issues.slice(0, 7).map((issue: any, index: number) => `${index + 1}. ${issue.driver_name || `Пилот #${issue.driver_number}`}: ${issue.message}`).join("\n")}`;
  }

  if (q.includes("сравн") || q.includes("лучше")) {
    return `${prefix}Для общего сравнения смотри финиш, время/отставание и лучший круг:\n${topDriversText(drivers, 8)}`;
  }

  if (q.includes("погод")) {
    return `${prefix}${weather ? `Погода: воздух ${weather.air_temperature}°C, трасса ${weather.track_temperature}°C, влажность ${weather.humidity}%.` : "Погода недоступна: OpenF1 не вернул weather для этой сессии."}`;
  }

  return `${prefix}Гонка: ${session.meeting_name || "—"}.\nПобедитель: ${summary.winner?.full_name || drivers.find((driver: any) => Number(driver.finishing_position) === 1)?.full_name || "—"}.\nПилотов в данных: ${summary.total_drivers ?? drivers.length ?? 0}.\nПит-стопов: ${summary.pit_stop_count ?? "—"}.\nRace Control событий: ${summary.race_control_event_count ?? context.race_control_events_count ?? 0}.\n\nКачество данных: session_result=${Boolean(dataQuality.has_session_result)}, laps=${Boolean(dataQuality.has_laps)}, drivers=${Boolean(dataQuality.has_drivers)}, finish_times=${Boolean(dataQuality.has_finish_times)}, fastest_laps=${Boolean(dataQuality.has_fastest_laps)}.`;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Метод не поддерживается" });

  const body = req.body || {};
  const question = String(body.question || body.message || "Сделай короткий комментарий по выбранной гонке");
  const context = buildCompactContext(body);
  if (!context?.session && !context?.summary) return res.status(400).json({ success: false, error: "Нет контекста гонки для ИИ-чата" });

  const prompt = `Ответь на вопрос пользователя по выбранной гонке. Не зацикливайся на одном пилоте, отвечай по гонке в целом.\n\nВопрос: ${question}\n\nКонтекст OpenF1/Jolpica:\n${safeSliceJson(context)}`;
  const noKeyReason = getGigaAuthKey() ? "" : "не задан GIGACHAT_AUTH_KEY в .env";
  const fallback = buildFallbackAnswer(context, question, noKeyReason);

  try {
    const gigaChatText = await generateWithGigaChat(prompt, body.messages || []);
    if (gigaChatText) return res.status(200).json({ success: true, provider: "GigaChat", analysis: gigaChatText, answer: gigaChatText });

    if (!process.env.GEMINI_API_KEY) return res.status(200).json({ success: true, provider: noKeyReason ? "gigachat-not-configured" : "factual-fallback", analysis: fallback, answer: fallback });

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({ model: process.env.GEMINI_MODEL || "gemini-3.5-flash", contents: prompt });
    return res.status(200).json({ success: true, provider: "Gemini", analysis: response.text || fallback, answer: response.text || fallback });
  } catch (error: any) {
    const reason = error?.message || "ошибка подключения к GigaChat";
    const errorFallback = buildFallbackAnswer(context, question, reason);
    return res.status(200).json({ success: true, provider: "factual-fallback", analysis: errorFallback, answer: errorFallback });
  }
}
