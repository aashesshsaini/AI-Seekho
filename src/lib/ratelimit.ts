import "server-only";
import { connectDb } from "./db";
import { RateLimit } from "./models/system";
import { env } from "./env";
import { hashIp } from "./crypto";

/**
 * Fixed-window rate limiter backed by MongoDB so it works across serverless
 * instances. Expired windows are removed by a TTL index.
 */
export async function rateLimit(
  bucket: string,
  identifier: string,
  limit: number,
  windowSeconds: number,
): Promise<{ ok: boolean; remaining: number; retryAfter: number }> {
  await connectDb();
  const windowStart = Math.floor(Date.now() / 1000 / windowSeconds) * windowSeconds;
  const key = `${bucket}:${identifier}:${windowStart}`;
  const expiresAt = new Date((windowStart + windowSeconds) * 1000);
  let doc;
  try {
    doc = await RateLimit.findOneAndUpdate(
      { key },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
      { upsert: true, returnDocument: "after" },
    ).lean();
  } catch (err) {
    // Concurrent upsert race on the unique key: retry once as a plain update.
    if ((err as { code?: number }).code === 11000) {
      doc = await RateLimit.findOneAndUpdate({ key }, { $inc: { count: 1 } }, { returnDocument: "after" }).lean();
    } else {
      throw err;
    }
  }
  const count = doc?.count ?? 1;
  const retryAfter = Math.max(1, windowStart + windowSeconds - Math.floor(Date.now() / 1000));
  return { ok: count <= limit, remaining: Math.max(0, limit - count), retryAfter };
}

export function clientIp(req: Request): string {
  const h = req.headers;
  return (
    h.get("x-nf-client-connection-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "unknown"
  );
}

export function ipKey(req: Request): string {
  return hashIp(clientIp(req), env.appSecret);
}

export function tooManyRequests(retryAfter: number): Response {
  return Response.json(
    { error: "Bahut zyada requests. Thodi der baad dobara try kariye." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}
