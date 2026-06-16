import { ensureDatabase, getDatabaseStats, getDbPath, resetDatabase } from "../src/db/f1Sqlite.js";

const shouldReset = process.argv.includes("--reset");

if (shouldReset) {
  resetDatabase();
} else {
  ensureDatabase();
}

const stats = getDatabaseStats();
console.log("SQLite база Формулы-1 готова");
console.log(`Файл: ${getDbPath()}`);
console.table(stats);
