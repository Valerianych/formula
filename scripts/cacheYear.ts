import { getOpenF1RaceDashboard, getOpenF1Sessions, parseYear } from "../api/_f1Api.ts";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const year = parseYear(process.argv[2], 2025);
  console.log(`Caching F1 season ${year}...`);

  const sessions = await getOpenF1Sessions(year);
  console.log(`Found ${sessions.length} race sessions.`);

  for (const [index, session] of sessions.entries()) {
    console.log(`[${index + 1}/${sessions.length}] ${session.meeting_name} (${session.session_key})`);
    try {
      const data = await getOpenF1RaceDashboard(session.session_key);
      const source = data?.data_quality?.source || "unknown source";
      const drivers = data?.drivers?.length || 0;
      const laps = data?.laps?.length || 0;
      console.log(`  cached: ${drivers} drivers, ${laps} laps, source: ${source}`);
    } catch (error: any) {
      console.log(`  skipped: ${error?.message || "unknown error"}`);
    }
    await sleep(1400);
  }

  console.log(`Done. Cache folder: data/openf1-cache`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
