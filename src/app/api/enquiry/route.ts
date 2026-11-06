import { isDbConfigured } from "@/lib/env";
import { clientIp, ipKey, rateLimit, tooManyRequests } from "@/lib/ratelimit";
import { submitEnquiry } from "@/lib/enquiry";

export async function POST(req: Request) {
  if (!isDbConfigured()) return Response.json({ error: "storage_unavailable" }, { status: 503 });
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > 20_000) return Response.json({ error: "payload_too_large" }, { status: 413 });
  const limit = await rateLimit("enquiry", ipKey(req), 5, 3600);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);
  const body = await req.json().catch(() => null);
  try {
    const result = await submitEnquiry(body, clientIp(req));
    return Response.json(result.body, { status: result.status });
  } catch (err) {
    console.error("[enquiry] error", (err as Error).name);
    return Response.json({ error: "server_error" }, { status: 500 });
  }
}
