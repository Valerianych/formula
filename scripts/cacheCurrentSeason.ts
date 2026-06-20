import { getOpenF1RaceDashboard, getOpenF1Sessions, parseYear } from "../api/_f1Api.ts";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isFutureSession(session: any) {
  const time = new Date(session.date_start || 0).getTime();
  return Number.isFinite(time) && time > Date.now();
}

async function main() {
  const year = parseYear(process.argv[2], new Date().getFullYear());
  console.log(`Caching current/live F1 season ${year}...`);
  console.log("This mode skips future races and keeps incomplete sessions as partial data.");

  const sessions = await getOpenF1Sessions(year);
  const completedOrStarted = sessions.filter((session: any) => !isFutureSession(session));

  console.log(`Found ${sessions.length} race sessions from OpenF1.`);
  console.log(`Will cache ${completedOrStarted.length} sessions that are not in the future.`);

  if (!completedOrStarted.length) {
    console.log("No completed/current race sessions are available yet. This is normal for an early/current season.");
    return;
  }

  for (const [index, session] of completedOrStarted.entries()) {
    console.log(`[${index + 1}/${completedOrStarted.length}] ${session.meeting_name} (${session.session_key})`);
    try {
      const data = await getOpenF1RaceDashboard(session.session_key);
      const source = data?.data_quality?.source || "unknown source";
      const drivers = data?.drivers?.length || 0;
      const laps = data?.laps?.length || 0;
      const note = data?.data_quality?.note || "";
      console.log(`  cached: ${drivers} drivers, ${laps} laps, source: ${source}`);
      if (!drivers || !laps) console.log(`  partial: ${note || "current-season data may be incomplete"}`);
    } catch (error: any) {
      console.log(`  skipped: ${error?.message || "unknown error"}`);
    }
    await sleep(1800);
  }

  console.log("Done. For current seasons, rerun this after a race finishes or after OpenF1/FastF1 publishes more data.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
