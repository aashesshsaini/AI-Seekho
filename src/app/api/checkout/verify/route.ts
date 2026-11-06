import { cookies } from "next/headers";
import { ipKey, rateLimit, tooManyRequests } from "@/lib/ratelimit";
import { handleCheckoutVerify } from "@/lib/payments/handlers";
import { CHECKOUT_COOKIE } from "@/lib/payments/service";

export async function POST(req: Request) {
  const limit = await rateLimit("verify", ipKey(req), 30, 600);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);
  const body = await req.json().catch(() => null);
  try {
    const result = await handleCheckoutVerify(body, (await cookies()).get(CHECKOUT_COOKIE)?.value);
    return Response.json(result.body, { status: result.status, headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[checkout/verify] error", (err as Error).name);
    // Never claim success on error — the order page will show pending and the webhook resolves it.
    return Response.json({ status: "pending" }, { status: 202 });
  }
}
