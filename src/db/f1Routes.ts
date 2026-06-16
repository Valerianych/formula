import type { Express } from "express";
import {
  getDatabaseStats,
  getDriverLaps,
  getRaceResults,
  getSessionData,
  getSessionsByYear,
  getStandings,
} from "./f1Sqlite.js";

function parseYear(value: unknown, fallback = 2025) {
  const year = Number(value || fallback);
  return Number.isFinite(year) ? year : fallback;
}

export function registerDatabaseRoutes(app: Express) {
  app.get("/api/db-status", (_req, res) => {
    res.json({
      success: true,
      source: "SQLite local database",
      stats: getDatabaseStats(),
    });
  });

  app.get("/api/sessions", (req, res) => {
    const year = parseYear(req.query.year);
    const sessions = getSessionsByYear(year);
    res.json({
      success: true,
      sessions,
      isDemo: false,
      source: "SQLite local database",
      note: "Данные загружены из локальной SQLite-базы, внешний API не запрашивался.",
    });
  });

  app.get("/api/session-data", (req, res) => {
    const sessionKey = Number(req.query.session_key);
    if (!Number.isFinite(sessionKey)) {
      return res.status(400).json({ error: "Параметр session_key обязателен" });
    }

    const data = getSessionData(sessionKey);
    if (!data) {
      return res.status(404).json({ success: false, error: "Сессия не найдена в SQLite-базе" });
    }

    return res.json({
      success: true,
      isDemo: false,
      source: "SQLite local database",
      data,
    });
  });

  app.get("/api/driver-laps", (req, res) => {
    const sessionKey = Number(req.query.session_key);
    const driverNumber = Number(req.query.driver_number);
    if (!Number.isFinite(sessionKey) || !Number.isFinite(driverNumber)) {
      return res.status(400).json({ error: "Параметры session_key и driver_number обязательны" });
    }

    const laps = getDriverLaps(sessionKey, driverNumber);
    return res.json({
      success: true,
      source: "SQLite local database",
      laps,
    });
  });

  app.get("/api/standings", (req, res) => {
    const year = parseYear(req.query.year);
    const standings = getStandings(year);
    return res.json({
      success: true,
      year,
      source: "SQLite local database",
      drivers: standings.drivers,
      constructors: standings.constructors,
    });
  });

  app.get("/api/results", (req, res) => {
    const year = parseYear(req.query.year);
    const races = getRaceResults(year);
    return res.json({
      success: true,
      year,
      source: "SQLite local database",
      races,
    });
  });
}
