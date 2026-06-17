import express from "express";
import path from "path";
import dotenv from "dotenv";
import analyzeHandler from "./api/analyze.ts";
import driverLapsHandler from "./api/driver-laps.ts";
import resultsHandler from "./api/results.ts";
import sessionDataHandler from "./api/session-data.ts";
import sessionsHandler from "./api/sessions.ts";
import standingsHandler from "./api/standings.ts";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json());

app.get("/api/sessions", sessionsHandler);
app.get("/api/session-data", sessionDataHandler);
app.get("/api/driver-laps", driverLapsHandler);
app.get("/api/standings", standingsHandler);
app.get("/api/results", resultsHandler);
app.post("/api/analyze", analyzeHandler);

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode with Vite Middleware...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode with built static assets...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`F1 AI Analyst Server bound and running on http://localhost:${PORT}`);
  });
}

startServer();
