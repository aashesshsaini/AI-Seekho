import { cookies } from "next/headers";
import { checkoutRequestSchema as schema } from "@/lib/payments/schemas";
import { env, isDbConfigured, isRazorpayConfigured } from "@/lib/env";
import { ipKey, rateLimit, tooManyRequests } from "@/lib/ratelimit";
import { appendCheckoutCookie, CHECKOUT_COOKIE, CheckoutError, createCheckout } from "@/lib/payments/service";

export async function POST(req: Request) {
  if (!isDbConfigured() || !isRazorpayConfigured()) {
    return Response.json({ error: "payments_not_configured" }, { status: 503 });
  }
  const limit = await rateLimit("checkout", ipKey(req), 10, 600);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_request" }, { status: 400 });

  try {
    const { order, accessSecret, razorpayOrderId } = await createCheckout(parsed.data);
    const store = await cookies();
    store.set(CHECKOUT_COOKIE, appendCheckoutCookie(store.get(CHECKOUT_COOKIE)?.value, order.publicId, accessSecret), {
      httpOnly: true,
      secure: env.isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
    });
    return Response.json(
      {
        publicId: order.publicId,
        keyId: env.razorpayKeyId,
        razorpayOrderId,
        amount: order.amountPaise,
        currency: order.currency,
        productName: order.productName,
        prefill: { name: parsed.data.name, email: parsed.data.email, ...(parsed.data.phone ? { contact: parsed.data.phone } : {}) },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    if (err instanceof CheckoutError) {
      const map = { PRODUCT_UNAVAILABLE: [404, "product_unavailable"], PAYMENTS_NOT_CONFIGURED: [503, "payments_not_configured"], GATEWAY_ERROR: [502, "gateway_error"] } as const;
      const [status, error] = map[err.code];
      return Response.json({ error }, { status });
    }
    console.error("[checkout/create] unexpected error", (err as Error).name);
    return Response.json({ error: "server_error" }, { status: 500 });
  }
}
