import { getRaceResults, parseYear } from "../src/data/f1VercelData";

export default function handler(req: any, res: any) {
  const year = parseYear(req.query?.year);

  return res.status(200).json({
    success: true,
    year,
    source: "Vercel API + local data",
    races: getRaceResults(year),
  });
}
