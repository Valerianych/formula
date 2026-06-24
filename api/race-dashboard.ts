import { getOpenF1RaceDashboard } from "./_f1Api.ts";

function emptyRaceDashboard(sessionKey: number, message: string) {
  return {
    session: {
      session_key: sessionKey,
      session_name: "Race",
      meeting_name: "Данные гонки недоступны",
      location: "—",
      country_name: "—",
      year: null,
      date_start: null,
    },
    summary: {
      winner: null,
      top3: [],
      total_drivers: 0,
      dnf_count: 0,
      dns_count: 0,
      dsq_count: 0,
      pit_stop_count: 0,
      race_control_event_count: 0,
      weather_latest: null,
    },
    drivers: [],
    driver_summaries: [],
    race_result: [],
    starting_grid: [],
    laps: [],
    pit_stops: [],
    stints: [],
    positions: [],
    intervals: [],
    events: [],
    race_control: [],
    weather: [],
    overtakes: [],
    team_radio: [],
    track_map: { points: [], note: message },
    issues: [],
    data_quality: {
      source: "OpenF1 API",
      has_drivers: false,
      has_session_result: false,
      has_laps: false,
      has_pit_stops: false,
      has_stints: false,
      has_positions: false,
      has_intervals: false,
      has_location: false,
      has_overtakes: false,
      has_team_radio: false,
      no_mock_data: true,
      note: message,
    },
  };
}

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store, no-cache, max-age=0, must-revalidate");

  const sessionKey = Number(req.query?.session_key);
  if (!Number.isFinite(sessionKey)) {
    return res.status(400).json({ success: false, error: "Параметр session_key обязателен" });
  }

  try {
    const data = await getOpenF1RaceDashboard(sessionKey);
    if (!data?.session || !data?.summary) {
      return res.status(200).json({
        success: true,
        source: "OpenF1 API",
        data: emptyRaceDashboard(sessionKey, "OpenF1 вернул сессию, но не вернул полезные данные гонки. Выберите другую гонку."),
        warning: "empty_openf1_session",
        note: "Фейковые данные не использовались.",
      });
    }

    return res.status(200).json({
      success: true,
      source: "OpenF1 API",
      data,
      note: "Полный пакет гонки: итог, пилоты, круги, пит-стопы, шины, позиции, карта, инциденты и вычисленные проблемные моменты.",
    });
  } catch (error: any) {
    return res.status(200).json({
      success: true,
      source: "OpenF1 API",
      data: emptyRaceDashboard(sessionKey, error?.message || "OpenF1 API unavailable"),
      warning: "openf1_request_failed",
      error: error?.message || "OpenF1 API unavailable",
      note: "Фейковые данные не использовались.",
    });
  }
}
