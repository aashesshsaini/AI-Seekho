import { cookies } from "next/headers";
import { connection } from "next/server";
import { CHECKOUT_COOKIE, getOrderForBuyer } from "@/lib/payments/service";
import { publicStatus } from "@/lib/payments/handlers";
import { ipKey, rateLimit, tooManyRequests } from "@/lib/ratelimit";

export async function GET(req: Request, ctx: RouteContext<"/api/orders/[publicId]/status">) {
  await connection();
  const { publicId } = await ctx.params;
  const limit = await rateLimit("order-status", ipKey(req), 120, 600);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);
  const order = await getOrderForBuyer(publicId, (await cookies()).get(CHECKOUT_COOKIE)?.value);
  if (!order) return Response.json({ error: "not_found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  return Response.json({ status: publicStatus(order.status) }, { headers: { "Cache-Control": "no-store" } });
}
