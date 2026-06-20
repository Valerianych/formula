import { randomUUID } from "node:crypto";
import { GoogleGenAI } from "@google/genai";

let gigaChatTokenCache: { token: string; expiresAt: number } | null = null;

function formatTime(sec: number | null) {
  if (!sec) return "—";
  const mins = Math.floor(sec / 60);
  const remainingSecs = (sec % 60).toFixed(3);
  return mins > 0 ? `${mins}:${remainingSecs.padStart(6, "0")}` : `${remainingSecs}с`;
}

function safeSliceJson(value: any, maxLength = 12_000) {
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

  const history = chatMessages
    .filter((message) => ["user", "assistant"].includes(message.role))
    .slice(-8)
    .map((message) => ({ role: message.role, content: String(message.content || message.text || "").slice(0, 2000) }));

  const response = await fetch(`${process.env.GIGACHAT_API_BASE || "https://gigachat.devices.sberbank.ru/api/v1"}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      model: process.env.GIGACHAT_MODEL || "GigaChat",
      messages: [
        {
          role: "system",
          content: "Ты русскоязычный помощник по Формуле-1 внутри сайта аналитики гонок. Отвечай простым языком. Не выдумывай факты. Если данных нет в OpenF1-контексте, прямо скажи, что данных нет. По ошибкам пилотов используй аккуратные формулировки: возможный проблемный момент, Race Control отметил, по данным видно.",
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
  const bestLap = lapTimes.length ? Math.min(...lapTimes) : null;
  const avgLap = lapTimes.length ? lapTimes.reduce((sum: number, value: number) => sum + value, 0) / lapTimes.length : null;
  return {
    session,
    selected_driver: driver,
    summary,
    driver_stats: driver ? { best_lap: bestLap, average_lap: avgLap, laps_with_time: validLaps.length } : null,
    weather_latest: Array.isArray(weather) && weather.length ? weather[weather.length - 1] : null,
    race_control_events_count: Array.isArray(events) ? events.length : 0,
    race_control_events: Array.isArray(events) ? events.slice(0, 20) : [],
    issues: Array.isArray(issues) ? issues.slice(0, 30) : [],
  };
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

  const prefix = reason ? `GigaChat сейчас не отвечает: ${reason}\n\n` : "";

  if (q.includes("кто выиг") || q.includes("побед")) {
    const winner = summary.winner || top3[0];
    return `${prefix}${winner?.full_name ? `Победитель гонки: ${winner.full_name}${winner.team_name ? ` (${winner.team_name})` : ""}.` : "Победитель не определён: OpenF1 не вернул session_result по этой гонке."}`;
  }

  if (q.includes("косяч") || q.includes("ошиб") || q.includes("проблем") || q.includes("штраф")) {
    if (!issues.length) return `${prefix}По этой гонке анализатор не нашёл проблемных моментов. Это может означать, что Race Control/результаты OpenF1 для выбранной сессии пустые.`;
    return `${prefix}Проблемные моменты по данным API:\n${issues.slice(0, 5).map((issue: any, index: number) => `${index + 1}. ${issue.driver_name || `Пилот #${issue.driver_number}`}: ${issue.message}`).join("\n")}`;
  }

  if (q.includes("сравн") || q.includes("лучше")) {
    const ranked = drivers
      .filter((driver: any) => Number.isFinite(Number(driver.finishing_position)) || Number.isFinite(Number(driver.best_lap)))
      .slice(0, 6)
      .map((driver: any) => `${driver.full_name}: финиш ${driver.finishing_position ?? "—"}, лучший круг ${formatTime(driver.best_lap)}, пит-стопов ${driver.pit_stop_count ?? 0}`)
      .join("\n");
    return `${prefix}${ranked || "Сравнение недоступно: OpenF1 не вернул пилотов/круги по этой гонке."}`;
  }

  if (q.includes("погод")) {
    return `${prefix}${weather ? `Погода: воздух ${weather.air_temperature}°C, трасса ${weather.track_temperature}°C, влажность ${weather.humidity}%.` : "Погода недоступна: OpenF1 не вернул weather для этой сессии."}`;
  }

  return `${prefix}Гонка: ${session.meeting_name || "—"}. Пилотов в данных: ${summary.total_drivers ?? drivers.length ?? 0}. Пит-стопов: ${summary.pit_stop_count ?? "—"}. Race Control событий: ${summary.race_control_event_count ?? context.race_control_events_count ?? 0}.\n\nКачество данных: session_result=${Boolean(dataQuality.has_session_result)}, laps=${Boolean(dataQuality.has_laps)}, drivers=${Boolean(dataQuality.has_drivers)}. Если всё false/0, выбери другую гонку: OpenF1 вернул только календарную сессию без телеметрии.`;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Метод не поддерживается" });

  const body = req.body || {};
  const question = String(body.question || body.message || "Сделай короткий комментарий по выбранной гонке");
  const context = buildCompactContext(body);
  if (!context?.session && !context?.summary) return res.status(400).json({ success: false, error: "Нет контекста гонки для ИИ-чата" });

  const prompt = `Ответь на вопрос пользователя по данным гонки.\n\nВопрос: ${question}\n\nКонтекст OpenF1/Jolpica:\n${safeSliceJson(context)}`;
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
