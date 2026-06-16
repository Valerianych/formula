import { getDataStatus } from "../src/data/f1VercelData";

export default function handler(_req: any, res: any) {
  return res.status(200).json({
    success: true,
    ...getDataStatus(),
  });
}
