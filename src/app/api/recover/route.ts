import { isDbConfigured } from "@/lib/env";
import { ipKey, rateLimit, tooManyRequests } from "@/lib/ratelimit";
import { requestRecovery } from "@/lib/recovery";

export async function POST(req: Request) {
  if (!isDbConfigured()) return Response.json({ error: "unavailable" }, { status: 503 });
  const limit = await rateLimit("recover", ipKey(req), 5, 3600);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);
  try {
    const result = await requestRecovery(await req.json().catch(() => null));
    return Response.json(result.body, { status: result.status, headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[recover] error", (err as Error).name);
    return Response.json({ error: "server_error" }, { status: 500 });
  }
}
