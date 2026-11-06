import { connection } from "next/server";
import { clientIp, ipKey, rateLimit, tooManyRequests } from "@/lib/ratelimit";
import { serveDownload } from "@/lib/download";

export async function GET(req: Request) {
  await connection();
  const limit = await rateLimit("download", ipKey(req), 60, 600);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);
  try {
    return await serveDownload(new URL(req.url), clientIp(req));
  } catch (err) {
    console.error("[download] error", (err as Error).name);
    return new Response("Download error. Kripya dobara try kariye.", { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
