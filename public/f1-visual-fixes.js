(() => {
  const YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018];
  let state = {
    year: 2025,
    races: [],
    standings: { drivers: [], constructors: [] },
    sessions: [],
    selectedSessionKey: "",
    sessionData: null,
    selectedDriverNumber: "",
    laps: [],
    loading: false,
    error: "",
  };

  function css() {
    return `
      :root { color-scheme: dark; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        background: #080a12;
        color: #f5f7fb;
        font-family: Inter, Arial, sans-serif;
      }
      .api-app {
        min-height: 100vh;
        background:
          radial-gradient(circle at top right, rgba(225,6,0,.18), transparent 34%),
          linear-gradient(180deg, #10121d 0%, #080a12 100%);
      }
      .api-header {
        position: sticky;
        top: 0;
        z-index: 10;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 18px;
        padding: 18px 28px;
        background: rgba(12, 14, 24, .94);
        border-bottom: 1px solid #25283a;
        backdrop-filter: blur(10px);
      }
      .brand { display: flex; align-items: center; gap: 14px; }
      .logo {
        width: 52px;
        height: 52px;
        border-radius: 12px;
        background: #e10600;
        display: grid;
        place-items: center;
        font-weight: 1000;
        font-size: 22px;
        font-style: italic;
      }
      .brand h1 { margin: 0; font-size: 22px; line-height: 1; font-style: italic; }
      .brand p { margin: 6px 0 0; color: #aeb5c8; font-size: 12px; font-weight: 800; }
      .source-badge {
        border: 1px solid rgba(225,6,0,.45);
        background: rgba(225,6,0,.12);
        color: #fff;
        border-radius: 999px;
        padding: 10px 14px;
        font-size: 12px;
        font-weight: 1000;
        text-transform: uppercase;
      }
      .wrap { max-width: 1480px; margin: 0 auto; padding: 28px; }
      .panel {
        background: rgba(22, 25, 40, .92);
        border: 1px solid #2a2e45;
        border-radius: 22px;
        box-shadow: 0 18px 50px rgba(0,0,0,.22);
      }
      .controls { padding: 18px; margin-bottom: 22px; }
      .year-row { display: flex; flex-wrap: wrap; gap: 8px; }
      .year-btn {
        border: 1px solid #2c3048;
        background: #0c0f1a;
        color: #cfd5e7;
        border-radius: 12px;
        padding: 10px 14px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 1000;
      }
      .year-btn.active, .year-btn:hover { background: #e10600; color: #fff; border-color: #e10600; }
      .grid { display: grid; gap: 18px; }
      .grid-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .grid-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .card { padding: 20px; }
      .label { color: #9ea8c6; text-transform: uppercase; font-size: 11px; letter-spacing: .08em; font-weight: 1000; margin-bottom: 10px; }
      .big { font-size: 30px; font-weight: 1000; line-height: 1.1; }
      .red { color: #ff2b24; }
      .muted { color: #aab2ca; font-size: 13px; line-height: 1.45; }
      .winner-card {
        background: linear-gradient(135deg, #e10600 0%, #690000 100%);
        border-color: rgba(255,255,255,.22);
      }
      .winner-card .label, .winner-card .muted { color: rgba(255,255,255,.82); }
      .winner-name { font-size: 34px; font-weight: 1000; line-height: 1.08; margin: 8px 0; }
      .pill-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
      .pill { background: rgba(0,0,0,.25); border: 1px solid rgba(255,255,255,.18); border-radius: 999px; padding: 7px 10px; font-size: 12px; font-weight: 900; }
      .section-title { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin: 28px 0 12px; }
      .section-title h2 { margin: 0; font-size: 18px; text-transform: uppercase; letter-spacing: .04em; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th, td { padding: 12px 10px; border-bottom: 1px solid #25293e; text-align: left; }
      th { color: #8f9abb; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; }
      td:last-child, th:last-child { text-align: right; }
      .race-list { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
      .race-item { padding: 15px; background: #0d101b; border: 1px solid #25293e; border-radius: 16px; }
      .race-item .race-name { color: #fff; font-weight: 1000; font-size: 14px; line-height: 1.25; }
      .race-item .winner { margin-top: 10px; color: #fff; font-weight: 1000; }
      .race-item .team { color: #ff3830; font-size: 12px; font-weight: 900; }
      select {
        width: 100%;
        border: 1px solid #333851;
        background: #090b13;
        color: #fff;
        border-radius: 14px;
        padding: 13px 14px;
        font-weight: 900;
        outline: none;
      }
      .driver-row { display: flex; gap: 8px; flex-wrap: wrap; }
      .driver-btn { border: 1px solid #30354f; background: #0d101b; color: #fff; border-radius: 12px; padding: 10px 12px; cursor: pointer; font-weight: 1000; }
      .driver-btn.active, .driver-btn:hover { border-color: #e10600; background: #1d2134; }
      .bar { height: 10px; border-radius: 999px; background: #24293d; overflow: hidden; margin-top: 8px; }
      .bar span { display: block; height: 100%; background: #e10600; }
      .error { border: 1px solid rgba(255,180,0,.28); background: rgba(255,180,0,.08); color: #ffd782; padding: 14px 16px; border-radius: 14px; margin-bottom: 18px; font-weight: 800; }
      .loading { padding: 28px; color: #aeb5c8; font-weight: 900; }
      @media (max-width: 1000px) { .grid-3, .grid-2, .race-list { grid-template-columns: 1fr; } .api-header { flex-direction: column; align-items: flex-start; } }
    `;
  }

  function getRoot() {
    const root = document.getElementById("root") || document.body;
    root.innerHTML = `<style>${css()}</style><div class="api-app"><div class="loading">Загрузка данных с API...</div></div>`;
    return root;
  }

  async function api(url) {
    const response = await fetch(`${url}${url.includes("?") ? "&" : "?"}_=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    return response.json();
  }

  function fmt(value) {
    if (value === null || value === undefined || value === "") return "—";
    return String(value);
  }

  function fmtLap(seconds) {
    if (!seconds) return "—";
    const min = Math.floor(seconds / 60);
    const sec = (seconds % 60).toFixed(3).padStart(6, "0");
    return `${min}:${sec}`;
  }

  function lastWeather() {
    const weather = state.sessionData?.weather || [];
    return weather.length ? weather[weather.length - 1] : null;
  }

  function lapStats() {
    const valid = state.laps.filter((lap) => lap.lap_duration && lap.lap_duration > 0);
    if (!valid.length) return { best: null, avg: null, count: 0 };
    const values = valid.map((lap) => lap.lap_duration);
    return {
      best: Math.min(...values),
      avg: values.reduce((sum, item) => sum + item, 0) / values.length,
      count: valid.length,
    };
  }

  async function loadAll() {
    state.loading = true;
    state.error = "";
    render();

    try {
      const [results, standings, sessions] = await Promise.all([
        api(`/api/results?year=${state.year}`),
        api(`/api/standings?year=${state.year}`),
        api(`/api/sessions?year=${state.year}`),
      ]);

      state.races = results.races || [];
      state.standings = { drivers: standings.drivers || [], constructors: standings.constructors || [] };
      state.sessions = sessions.sessions || [];

      if (!state.selectedSessionKey || !state.sessions.some((item) => String(item.session_key) === String(state.selectedSessionKey))) {
        state.selectedSessionKey = state.sessions[0]?.session_key ? String(state.sessions[0].session_key) : "";
      }

      await loadSession();
    } catch (error) {
      state.error = `API не ответил: ${error.message}`;
      state.races = [];
      state.standings = { drivers: [], constructors: [] };
      state.sessions = [];
      state.sessionData = null;
      state.laps = [];
    } finally {
      state.loading = false;
      render();
    }
  }

  async function loadSession() {
    state.sessionData = null;
    state.laps = [];
    state.selectedDriverNumber = "";

    if (!state.selectedSessionKey) return;

    const data = await api(`/api/session-data?session_key=${state.selectedSessionKey}`);
    state.sessionData = data.data || null;

    const firstDriver = state.sessionData?.drivers?.[0];
    if (firstDriver?.driver_number) {
      state.selectedDriverNumber = String(firstDriver.driver_number);
      await loadLaps();
    }
  }

  async function loadLaps() {
    state.laps = [];
    if (!state.selectedSessionKey || !state.selectedDriverNumber) return;
    const data = await api(`/api/driver-laps?session_key=${state.selectedSessionKey}&driver_number=${state.selectedDriverNumber}`);
    state.laps = data.laps || [];
  }

  function selectedRace() {
    return state.races[0] || null;
  }

  function selectedSessionWinner() {
    const session = state.sessionData?.session;
    if (!session) return null;
    if (session.winner) return { winner: session.winner, team: session.winnerTeam, time: session.winnerTime, race: session.meeting_name };

    const event = (state.sessionData?.events || []).find((item) => String(item.category || "").toLowerCase() === "result");
    if (!event) return null;
    return { winner: event.message, team: "из API", time: "—", race: session.meeting_name };
  }

  function render() {
    const root = getRoot();
    const race = selectedRace();
    const weather = lastWeather();
    const stats = lapStats();
    const sessionWinner = selectedSessionWinner();

    root.querySelector(".api-app").innerHTML = `
      <header class="api-header">
        <div class="brand">
          <div class="logo">F1</div>
          <div>
            <h1>F1 ANALYTICS DECK</h1>
            <p>Все данные идут через OpenF1 API и Jolpica API. Демо-значения не используются.</p>
          </div>
        </div>
        <div class="source-badge">API ONLY</div>
      </header>

      <main class="wrap">
        ${state.error ? `<div class="error">${state.error}</div>` : ""}
        <section class="panel controls">
          <div class="label">Сезон</div>
          <div class="year-row">
            ${YEARS.map((year) => `<button class="year-btn ${year === state.year ? "active" : ""}" data-year="${year}">${year}</button>`).join("")}
          </div>
        </section>

        ${state.loading ? `<div class="panel loading">Загрузка реальных данных с API...</div>` : ""}

        <section class="grid grid-3">
          <div class="panel card winner-card">
            <div class="label">Последняя гонка с результатом API</div>
            <div class="winner-name">🥇 ${fmt(race?.winner)}</div>
            <div class="muted">${fmt(race?.raceName)} · ${fmt(race?.locality)}, ${fmt(race?.country)}</div>
            <div class="pill-row">
              <span class="pill">Команда: ${fmt(race?.winnerTeam)}</span>
              <span class="pill">Время: ${fmt(race?.time)}</span>
            </div>
          </div>

          <div class="panel card">
            <div class="label">Лидер личного зачёта</div>
            <div class="big">${fmt(state.standings.drivers?.[0]?.driverName)}</div>
            <div class="muted">${fmt(state.standings.drivers?.[0]?.teamName)} · ${fmt(state.standings.drivers?.[0]?.points)} очков · побед: ${fmt(state.standings.drivers?.[0]?.wins)}</div>
          </div>

          <div class="panel card">
            <div class="label">Лидер кубка конструкторов</div>
            <div class="big">${fmt(state.standings.constructors?.[0]?.teamName)}</div>
            <div class="muted">${fmt(state.standings.constructors?.[0]?.points)} очков · побед: ${fmt(state.standings.constructors?.[0]?.wins)}</div>
          </div>
        </section>

        <div class="section-title"><h2>Телеметрия выбранной гонки</h2><span class="muted">Источник: /api/sessions, /api/session-data, /api/driver-laps</span></div>
        <section class="panel card">
          <div class="grid grid-2">
            <div>
              <div class="label">Выберите этап из OpenF1</div>
              <select id="session-select">
                ${state.sessions.length ? state.sessions.map((item) => `<option value="${item.session_key}" ${String(item.session_key) === String(state.selectedSessionKey) ? "selected" : ""}>${fmt(item.meeting_name)} — ${fmt(item.session_name)}</option>`).join("") : `<option>API не вернул завершённые гонки</option>`}
              </select>
              ${sessionWinner ? `<div class="pill-row"><span class="pill">Победитель: ${fmt(sessionWinner.winner)}</span><span class="pill">Команда: ${fmt(sessionWinner.team)}</span></div>` : ""}
            </div>
            <div>
              <div class="label">Погода из OpenF1</div>
              <div class="big">${weather ? `${fmt(weather.track_temperature)}°C` : "—"}</div>
              <div class="muted">Воздух: ${weather ? `${fmt(weather.air_temperature)}°C` : "—"} · Влажность: ${weather ? `${fmt(weather.humidity)}%` : "—"} · Осадки: ${weather ? fmt(weather.rainfall) : "—"}</div>
            </div>
          </div>
        </section>

        <section class="grid grid-3" style="margin-top:18px">
          <div class="panel card">
            <div class="label">Лучший круг выбранного пилота</div>
            <div class="big">${fmtLap(stats.best)}</div>
            <div class="muted">Круги загружены из OpenF1: ${stats.count}</div>
          </div>
          <div class="panel card">
            <div class="label">Средний темп</div>
            <div class="big">${fmtLap(stats.avg)}</div>
            <div class="muted">Считается только по кругам, пришедшим из API.</div>
          </div>
          <div class="panel card">
            <div class="label">Пилоты из API</div>
            <div class="driver-row">
              ${(state.sessionData?.drivers || []).slice(0, 10).map((driver) => `<button class="driver-btn ${String(driver.driver_number) === String(state.selectedDriverNumber) ? "active" : ""}" data-driver="${driver.driver_number}">${fmt(driver.name_acronym)} · ${fmt(driver.full_name)}</button>`).join("") || `<span class="muted">Пилоты не пришли из API</span>`}
            </div>
          </div>
        </section>

        <div class="section-title"><h2>Победители гонок</h2><span class="muted">Источник: Jolpica /results/1.json</span></div>
        <section class="race-list">
          ${state.races.length ? state.races.map((item) => `
            <div class="race-item">
              <div class="muted">Раунд ${fmt(item.round)} · ${fmt(item.date)}</div>
              <div class="race-name">${fmt(item.raceName)}</div>
              <div class="winner">🥇 ${fmt(item.winner)}</div>
              <div class="team">${fmt(item.winnerTeam)}</div>
              <div class="muted">${fmt(item.circuitName)} · ${fmt(item.locality)}, ${fmt(item.country)}</div>
            </div>
          `).join("") : `<div class="panel card muted">Jolpica API не вернул победителей за выбранный сезон.</div>`}
        </section>

        <div class="section-title"><h2>Личный зачёт и команды</h2><span class="muted">Источник: Jolpica standings</span></div>
        <section class="grid grid-2">
          <div class="panel card">
            <div class="label">Пилоты</div>
            <table>
              <thead><tr><th>Поз.</th><th>Пилот</th><th>Команда</th><th>Очки</th></tr></thead>
              <tbody>${state.standings.drivers.length ? state.standings.drivers.map((d) => `<tr><td>${fmt(d.position)}</td><td>${fmt(d.driverName)}</td><td>${fmt(d.teamName)}</td><td>${fmt(d.points)}</td></tr>`).join("") : `<tr><td colspan="4">API не вернул таблицу пилотов</td></tr>`}</tbody>
            </table>
          </div>
          <div class="panel card">
            <div class="label">Команды</div>
            <table>
              <thead><tr><th>Поз.</th><th>Команда</th><th>Победы</th><th>Очки</th></tr></thead>
              <tbody>${state.standings.constructors.length ? state.standings.constructors.map((d) => `<tr><td>${fmt(d.position)}</td><td>${fmt(d.teamName)}</td><td>${fmt(d.wins)}</td><td>${fmt(d.points)}</td></tr>`).join("") : `<tr><td colspan="4">API не вернул таблицу команд</td></tr>`}</tbody>
            </table>
          </div>
        </section>
      </main>
    `;

    root.querySelectorAll(".year-btn").forEach((button) => {
      button.addEventListener("click", async () => {
        state.year = Number(button.dataset.year);
        state.selectedSessionKey = "";
        await loadAll();
      });
    });

    const sessionSelect = root.querySelector("#session-select");
    if (sessionSelect) {
      sessionSelect.addEventListener("change", async (event) => {
        state.selectedSessionKey = event.target.value;
        await loadSession();
        render();
      });
    }

    root.querySelectorAll(".driver-btn").forEach((button) => {
      button.addEventListener("click", async () => {
        state.selectedDriverNumber = button.dataset.driver;
        await loadLaps();
        render();
      });
    });
  }

  function start() {
    getRoot();
    loadAll();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
