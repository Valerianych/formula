(() => {
  const STYLE_ID = "f1-visual-fixes-style";
  const PANEL_ID = "f1-winner-spotlight";
  let lastSessionKey = "";
  let lastYear = "";
  let sessionsCache = new Map();

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${PANEL_ID} {
        position: fixed;
        top: 86px;
        right: 24px;
        z-index: 99999;
        width: min(420px, calc(100vw - 32px));
        background: linear-gradient(135deg, rgba(225, 6, 0, 0.98), rgba(105, 0, 0, 0.98));
        border: 1px solid rgba(255,255,255,0.24);
        border-radius: 20px;
        box-shadow: 0 22px 70px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.08) inset;
        color: #fff;
        padding: 18px 20px;
        font-family: Inter, Arial, sans-serif;
        transform: translateZ(0);
      }
      #${PANEL_ID} .f1-label {
        font-size: 11px;
        line-height: 1;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        font-weight: 900;
        opacity: 0.78;
        margin-bottom: 10px;
      }
      #${PANEL_ID} .f1-winner {
        font-size: 25px;
        line-height: 1.12;
        font-weight: 1000;
        text-transform: uppercase;
        margin-bottom: 8px;
      }
      #${PANEL_ID} .f1-race {
        font-size: 13px;
        line-height: 1.35;
        font-weight: 800;
        opacity: 0.95;
      }
      #${PANEL_ID} .f1-meta {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 12px;
      }
      #${PANEL_ID} .f1-pill {
        background: rgba(0,0,0,0.24);
        border: 1px solid rgba(255,255,255,0.20);
        border-radius: 999px;
        padding: 6px 9px;
        font-size: 11px;
        font-weight: 900;
      }
      #${PANEL_ID} .f1-close {
        position: absolute;
        top: 8px;
        right: 10px;
        border: 0;
        color: white;
        background: rgba(0,0,0,0.18);
        width: 24px;
        height: 24px;
        border-radius: 999px;
        cursor: pointer;
        font-weight: 900;
      }
      .f1-api-note {
        position: fixed;
        bottom: 16px;
        right: 16px;
        z-index: 99998;
        background: rgba(10, 12, 20, 0.94);
        color: #cfd2d6;
        border: 1px solid rgba(225,6,0,0.35);
        border-radius: 999px;
        padding: 8px 12px;
        font: 800 11px Inter, Arial, sans-serif;
        letter-spacing: .03em;
        box-shadow: 0 10px 30px rgba(0,0,0,.35);
      }
      @media (max-width: 700px) {
        #${PANEL_ID} { top: 76px; right: 12px; left: 12px; width: auto; }
      }
    `;
    document.head.appendChild(style);
  }

  function getRaceSelect() {
    const selects = Array.from(document.querySelectorAll("select"));
    return selects.find((select) => {
      const text = Array.from(select.options).map((option) => option.textContent || "").join(" ").toLowerCase();
      return text.includes("grand prix") || text.includes("race") || text.includes("гран-при");
    });
  }

  function getYearFromPage(select) {
    const selectedText = select?.selectedOptions?.[0]?.textContent || "";
    const fromSelected = selectedText.match(/20\d{2}/)?.[0];
    if (fromSelected) return fromSelected;

    const bodyText = document.body.innerText || "";
    const years = bodyText.match(/20\d{2}/g) || [];
    return years[0] || String(new Date().getFullYear());
  }

  async function fetchJson(url) {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async function loadSessions(year) {
    if (String(year) === lastYear && sessionsCache.size > 0) return sessionsCache;
    const payload = await fetchJson(`/api/sessions?year=${encodeURIComponent(year)}&visual=1`);
    const map = new Map();
    for (const session of payload.sessions || []) {
      if (session?.session_key) map.set(String(session.session_key), session);
    }
    sessionsCache = map;
    lastYear = String(year);
    return map;
  }

  function formatSessionOption(session) {
    const raceName = String(session.meeting_name || "Гонка").replace(/\s*\(20\d{2}\)\s*$/, "");
    const winner = session.winner || "победитель не найден";
    const team = session.winnerTeam ? ` (${session.winnerTeam})` : "";
    return `🏁 ${raceName} — 🥇 ${winner}${team}`;
  }

  async function cleanSelector(select, year) {
    const map = await loadSessions(year);
    if (!map.size) return;

    const options = Array.from(select.options);
    for (const option of options) {
      const session = map.get(String(option.value));
      if (session) {
        option.textContent = formatSessionOption(session);
        option.hidden = false;
        option.disabled = false;
      } else {
        option.hidden = true;
        option.disabled = true;
      }
    }

    if (!map.has(String(select.value))) {
      const first = Array.from(select.options).find((option) => !option.disabled && !option.hidden);
      if (first) {
        select.value = first.value;
        select.dispatchEvent(new Event("input", { bubbles: true }));
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
  }

  function buildWinnerFromSessionData(data) {
    const session = data?.data?.session;
    if (!session) return null;

    if (session.winner) {
      return {
        winner: session.winner,
        team: session.winnerTeam || "команда не указана",
        time: session.winnerTime || "время не указано",
        race: String(session.meeting_name || "Выбранная гонка").replace(/ - winner:.*/i, ""),
        place: [session.location, session.country_name].filter(Boolean).join(", "),
      };
    }

    const resultEvent = (data?.data?.events || []).find((event) => String(event.category || "").toLowerCase() === "result");
    if (resultEvent?.message) {
      return {
        winner: resultEvent.message,
        team: "данные результата",
        time: "из API",
        race: session.meeting_name || "Выбранная гонка",
        place: [session.location, session.country_name].filter(Boolean).join(", "),
      };
    }

    return null;
  }

  function renderPanel(info, sourceText) {
    if (!info) return;
    addStyles();

    let panel = document.getElementById(PANEL_ID);
    if (!panel) {
      panel = document.createElement("div");
      panel.id = PANEL_ID;
      document.body.appendChild(panel);
    }

    panel.innerHTML = `
      <button class="f1-close" title="Скрыть">×</button>
      <div class="f1-label">Победитель выбранной гонки</div>
      <div class="f1-winner">🥇 ${escapeHtml(info.winner)}</div>
      <div class="f1-race">${escapeHtml(info.race)}</div>
      <div class="f1-meta">
        <span class="f1-pill">Команда: ${escapeHtml(info.team)}</span>
        <span class="f1-pill">Место: ${escapeHtml(info.place || "не указано")}</span>
        <span class="f1-pill">Источник: ${escapeHtml(sourceText || "API")}</span>
      </div>
    `;

    panel.querySelector(".f1-close")?.addEventListener("click", () => panel.remove());
  }

  function renderApiNote(text) {
    let note = document.querySelector(".f1-api-note");
    if (!note) {
      note = document.createElement("div");
      note.className = "f1-api-note";
      document.body.appendChild(note);
    }
    note.textContent = text;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  async function updateVisuals() {
    const select = getRaceSelect();
    if (!select) return;

    const year = getYearFromPage(select);
    await cleanSelector(select, year).catch(() => null);

    const key = String(select.value || "");
    if (!key || key === lastSessionKey) return;
    lastSessionKey = key;

    const sessionPayload = await fetchJson(`/api/session-data?session_key=${encodeURIComponent(key)}&visual=1`).catch(() => null);
    const winnerInfo = buildWinnerFromSessionData(sessionPayload);

    if (winnerInfo) {
      renderPanel(winnerInfo, sessionPayload?.source || "OpenF1 + Jolpica");
      renderApiNote("Данные: OpenF1 + Jolpica API, без демо-подмены");
    }
  }

  function start() {
    addStyles();
    updateVisuals();
    setInterval(updateVisuals, 1800);

    const observer = new MutationObserver(() => updateVisuals());
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
