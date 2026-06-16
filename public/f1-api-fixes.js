(() => {
  const originalFetch = window.fetch.bind(window);

  window.fetch = (input, init) => {
    try {
      const url = typeof input === "string" ? input : input?.url;
      if (url && url.startsWith("/api/")) {
        const separator = url.includes("?") ? "&" : "?";
        const nextUrl = `${url}${separator}_ts=${Date.now()}`;
        return originalFetch(nextUrl, {
          ...init,
          cache: "no-store",
          headers: {
            ...(init?.headers || {}),
            "Cache-Control": "no-cache",
          },
        });
      }
    } catch (_) {
      return originalFetch(input, init);
    }

    return originalFetch(input, init);
  };

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
