import { getSessionData } from "../src/data/f1VercelData";

export default function handler(req: any, res: any) {
  const sessionKey = Number(req.query?.session_key);

  if (!Number.isFinite(sessionKey)) {
    return res.status(400).json({ success: false, error: "Параметр session_key обязателен" });
  }

  const data = getSessionData(sessionKey);
  if (!data) {
    return res.status(404).json({ success: false, error: "Сессия не найдена" });
  }

  return res.status(200).json({
    success: true,
    isDemo: false,
    source: "Vercel API + local data",
    data,
  });
}
