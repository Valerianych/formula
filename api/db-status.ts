export default function handler(_req: any, res: any) {
  return res.status(200).json({
    success: true,
    mode: "external-api",
    source: "OpenF1 API + Jolpica API",
    routes: {
      sessions: "OpenF1 API",
      sessionData: "OpenF1 API",
      driverLaps: "OpenF1 API",
      standings: "Jolpica API",
      results: "Jolpica API",
    },
    note: "Данные не хранятся локально и не подменяются демо-набором. Сайт запрашивает внешние API через Vercel Functions.",
  });
}
