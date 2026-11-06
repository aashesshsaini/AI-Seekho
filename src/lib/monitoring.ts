import "server-only";
import { connectDb } from "./db";
import { DownloadAudit, ProductAsset } from "./models/commerce";
import { getStorage } from "./storage";

/** Netlify credit rates (official pricing, checked 6 Nov 2026). Update if Netlify changes them. */
export const NETLIFY_RATES = { creditsPerGB: 20, creditsPerGBHour: 10, creditsPer10kRequests: 2, creditsPerProdDeploy: 15, freeMonthlyCredits: 300 };

export async function storageHealth(): Promise<{ driver: string; expected: number; present: number; mismatched: string[]; error?: string }> {
  await connectDb();
  const assets = await ProductAsset.find({ active: true }, { storageKey: 1, sizeBytes: 1, filename: 1 }).lean();
  try {
    const storage = getStorage();
    const results = await Promise.all(assets.map(async (a) => ({ a, s: await storage.stat(a.storageKey) })));
    const mismatched = results.filter((r) => r.s && r.s.size !== null && r.s.size !== r.a.sizeBytes).map((r) => r.a.filename);
    return { driver: storage.name, expected: assets.length, present: results.filter((r) => r.s).length, mismatched };
  } catch (err) {
    return { driver: "unavailable", expected: assets.length, present: 0, mismatched: [], error: (err as Error).message.slice(0, 120) };
  }
}

/** Month-to-date delivery usage from our own audit log (download egress only — not page traffic). */
export async function deliveryUsageThisMonth() {
  await connectDb();
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const rows = await DownloadAudit.aggregate<{ served: number; bytes: number }>([
    { $match: { outcome: "served", createdAt: { $gte: start } } },
    { $lookup: { from: "productassets", localField: "assetId", foreignField: "_id", as: "asset" } },
    { $unwind: "$asset" },
    { $group: { _id: null, served: { $sum: 1 }, bytes: { $sum: "$asset.sizeBytes" } } },
  ]);
  const served = rows[0]?.served ?? 0;
  const gb = (rows[0]?.bytes ?? 0) / 1e9;
  return { since: start, served, gb, estCredits: Math.round(gb * NETLIFY_RATES.creditsPerGB * 10) / 10 };
}
