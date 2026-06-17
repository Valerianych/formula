import { getOpenF1DriverLaps } from "./_f1Api.ts";

export default async function handler(req: any, res: any) {
  const sessionKey = Number(req.query?.session_key);
  const driverNumber = Number(req.query?.driver_number);

  if (!Number.isFinite(sessionKey) || !Number.isFinite(driverNumber)) {
    return res.status(400).json({ success: false, error: "Параметры session_key и driver_number обязательны" });
  }

  try {
    const laps = await getOpenF1DriverLaps(sessionKey, driverNumber);
    return res.status(200).json({
      success: true,
      source: "OpenF1 API",
      laps,
      note: laps.length ? "Круги получены с OpenF1 API." : "OpenF1 API не вернул круги по этому пилоту.",
    });
  } catch (error: any) {
    return res.status(200).json({
      success: true,
      source: "OpenF1 API",
      laps: [],
      error: error?.message || "OpenF1 API unavailable",
      note: "Данные не подменялись демо-набором. Внешний API сейчас не ответил.",
    });
  }
}
