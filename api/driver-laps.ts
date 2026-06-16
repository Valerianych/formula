import { getDriverLaps } from "../src/data/f1VercelData";

export default function handler(req: any, res: any) {
  const sessionKey = Number(req.query?.session_key);
  const driverNumber = Number(req.query?.driver_number);

  if (!Number.isFinite(sessionKey) || !Number.isFinite(driverNumber)) {
    return res.status(400).json({ success: false, error: "Параметры session_key и driver_number обязательны" });
  }

  return res.status(200).json({
    success: true,
    source: "Vercel API + local data",
    laps: getDriverLaps(sessionKey, driverNumber),
  });
}
