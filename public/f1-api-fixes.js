(() => {
  const originalFetch = window.fetch.bind(window);
  const errorLog = new Map();

  window.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input?.url;

    if (!url || !url.startsWith("/api/")) {
      return originalFetch(input, init);
    }

    const separator = url.includes("?") ? "&" : "?";
    const nextUrl = `${url}${separator}_ts=${Date.now()}`;

    try {
      const response = await originalFetch(nextUrl, {
        ...init,
        cache: "no-store",
        headers: {
          ...(init?.headers || {}),
          "Cache-Control": "no-cache",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      response.clone().json().then((payload) => {
        if (payload?.error) {
          showApiError(url, payload.error, payload.note || payload.source || "API вернул ошибку");
        }
      }).catch(() => null);

      return response;
    } catch (error) {
      const message = error?.message || "API request failed";
      showApiError(url, message, "Внешний API не ответил. Заглушки отключены, поэтому данные не подменяются.");

      return new Response(JSON.stringify(emptyPayload(url, message)), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  };

  function emptyPayload(url, message) {
    const base = {
      success: true,
      isDemo: false,
      source: "API error",
      error: message,
      note: "Заглушки отключены. Данные не подменялись.",
    };

    if (url.startsWith("/api/sessions")) {
      return { ...base, sessions: [] };
    }

    if (url.startsWith("/api/session-data")) {
      return { ...base, data: { session: null, drivers: [], weather: [], events: [], laps: {} } };
    }

    if (url.startsWith("/api/driver-laps")) {
      return { ...base, laps: [] };
    }

    if (url.startsWith("/api/standings")) {
      return { ...base, drivers: [], constructors: [], seasonLeader: "Ошибка API" };
    }

    if (url.startsWith("/api/results")) {
      return { ...base, races: [] };
    }

    if (url.startsWith("/api/analyze")) {
      return { ...base, analysis: `### Ошибка API\n\n${message}` };
    }

    return base;
  }

  function showApiError(url, message, note) {
    errorLog.set(url.split("?")[0], { message, note, time: new Date().toLocaleTimeString("ru-RU") });
    renderApiErrorPanel();
  }

  function renderApiErrorPanel() {
    let panel = document.getElementById("f1-api-error-panel");
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "f1-api-error-panel";
      panel.style.position = "fixed";
      panel.style.left = "16px";
      panel.style.bottom = "16px";
      panel.style.zIndex = "99999";
      panel.style.maxWidth = "520px";
      panel.style.background = "rgba(35, 12, 12, 0.96)";
      panel.style.color = "#fff";
      panel.style.border = "1px solid rgba(225,6,0,.55)";
      panel.style.borderRadius = "16px";
      panel.style.boxShadow = "0 18px 50px rgba(0,0,0,.45)";
      panel.style.padding = "14px 16px";
      panel.style.fontFamily = "Inter, Arial, sans-serif";
      document.body.appendChild(panel);
    }

    const items = Array.from(errorLog.entries()).slice(-4);
    panel.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px;">
        <div style="font-size:12px;font-weight:1000;text-transform:uppercase;letter-spacing:.08em;color:#ffb4b4;">Ошибка API</div>
        <button id="f1-api-error-close" style="border:0;background:rgba(255,255,255,.12);color:#fff;border-radius:999px;width:24px;height:24px;cursor:pointer;font-weight:900;">×</button>
      </div>
      <div style="font-size:12px;line-height:1.45;color:#ffd6d6;margin-bottom:8px;">Заглушки отключены. Сайт показывает ошибку, а не выдуманные данные.</div>
      ${items.map(([url, item]) => `
        <div style="border-top:1px solid rgba(255,255,255,.12);padding-top:8px;margin-top:8px;">
          <div style="font-size:11px;font-weight:900;color:#fff;">${escapeHtml(url)}</div>
          <div style="font-size:11px;color:#ffb4b4;">${escapeHtml(item.message)}</div>
          <div style="font-size:10px;color:#b7a0a0;">${escapeHtml(item.note)} · ${escapeHtml(item.time)}</div>
        </div>
      `).join("")}
    `;

    document.getElementById("f1-api-error-close")?.addEventListener("click", () => panel.remove());
  }

  function improveWinnerRows() {
    const rows = Array.from(document.querySelectorAll("div"));

    for (const row of rows) {
      if (row.dataset.winnerFixed === "1") continue;
      const text = (row.textContent || "").trim();
      if (!text.startsWith("Победитель:") || text.length < 14) continue;

      const spans = row.querySelectorAll("span");
      const value = spans.length > 1 ? spans[1].textContent?.trim() : text.replace("Победитель:", "").trim();
      if (!value) continue;

      row.dataset.winnerFixed = "1";
      row.style.display = "block";
      row.style.borderTop = "1px solid #1a1b24";
      row.style.paddingTop = "10px";
      row.style.marginTop = "6px";

      row.innerHTML = `
        <div style="font-size:10px;color:#9ca3af;text-transform:uppercase;font-weight:900;letter-spacing:.08em;margin-bottom:4px;">Победитель гонки</div>
        <div style="font-size:13px;color:#fff;font-weight:1000;line-height:1.25;">🥇 ${escapeHtml(value)}</div>
      `;
    }
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function start() {
    improveWinnerRows();
    setInterval(improveWinnerRows, 1000);
    new MutationObserver(improveWinnerRows).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
