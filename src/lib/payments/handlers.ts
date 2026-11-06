import "server-only";
import { z } from "zod";
import { env } from "../env";
import { sha256Hex } from "../crypto";
import { verifyCheckoutSignature, verifyWebhookSignature, type RzpPayment } from "./razorpay";
import { applyPaymentState, claimPaymentEvent, completePaymentEvent, getGateway, getOrderForBuyer } from "./service";

type HandlerResult = { status: number; body: Record<string, unknown> };

/* ---------------------------------------------------------------- webhook */

const paymentEntity = z.object({
  id: z.string(),
  order_id: z.string().nullable(),
  amount: z.number().int(),
  currency: z.string(),
  status: z.enum(["created", "authorized", "captured", "refunded", "failed"]),
  method: z.string().optional(),
  amount_refunded: z.number().int().optional(),
  error_description: z.string().nullable().optional(),
});

const webhookEnvelope = z.object({
  event: z.string(),
  payload: z.object({ payment: z.object({ entity: paymentEntity }).optional() }).passthrough(),
});

const HANDLED = new Set(["payment.authorized", "payment.captured", "payment.failed", "order.paid", "refund.processed"]);

export async function handleRazorpayWebhook(rawBody: string, headers: Headers): Promise<HandlerResult> {
  const secret = env.razorpayWebhookSecret;
  if (!secret) return { status: 503, body: { error: "webhook_not_configured" } };

  // Signature is computed over the exact raw bytes — never re-serialised JSON.
  if (!verifyWebhookSignature(rawBody, headers.get("x-razorpay-signature"), secret)) {
    return { status: 400, body: { error: "invalid_signature" } };
  }

  let parsed: z.infer<typeof webhookEnvelope>;
  try {
    parsed = webhookEnvelope.parse(JSON.parse(rawBody));
  } catch {
    return { status: 400, body: { error: "invalid_payload" } };
  }
  if (!HANDLED.has(parsed.event)) return { status: 200, body: { ok: true, ignored: parsed.event } };

  const payment = parsed.payload.payment?.entity;
  if (!payment?.order_id) return { status: 200, body: { ok: true, ignored: "no_order" } };

  const eventId = headers.get("x-razorpay-event-id") ?? `body:${sha256Hex(rawBody)}`;
  const shouldProcess = await claimPaymentEvent({
    eventId,
    source: "webhook",
    type: parsed.event,
    razorpayOrderId: payment.order_id,
    razorpayPaymentId: payment.id,
    amountPaise: payment.amount,
    currency: payment.currency,
    paymentStatus: payment.status,
  });
  if (!shouldProcess) return { status: 200, body: { ok: true, duplicate: true } };

  const fullyRefunded =
    parsed.event === "refund.processed" && typeof payment.amount_refunded === "number" && payment.amount_refunded >= payment.amount;

  // order.paid always implies a captured payment.
  const effective: RzpPayment = {
    ...payment,
    status: parsed.event === "order.paid" ? "captured" : payment.status,
  };
  if (parsed.event === "refund.processed" && !fullyRefunded) {
    await completePaymentEvent(eventId, "partial_refund_ignored");
    return { status: 200, body: { ok: true, outcome: "partial_refund_ignored" } };
  }

  // Errors propagate → 500 → Razorpay retries; the event stays unprocessed so the retry is handled.
  const { outcome, order } = await applyPaymentState({
    razorpayOrderId: payment.order_id,
    payment: effective,
    source: "webhook",
    fullyRefunded,
  });
  await completePaymentEvent(eventId, outcome, order?._id);
  return { status: 200, body: { ok: true, outcome } };
}

/* ------------------------------------------------------- checkout verify */

export const verifySchema = z.object({
  publicId: z.string().regex(/^AIS-[A-Z0-9]{5}-[A-Z0-9]{5}$/),
  razorpay_order_id: z.string().regex(/^order_[A-Za-z0-9]+$/),
  razorpay_payment_id: z.string().regex(/^pay_[A-Za-z0-9]+$/),
  razorpay_signature: z.string().regex(/^[a-f0-9]{64}$/),
});

export async function handleCheckoutVerify(body: unknown, checkoutCookie: string | undefined): Promise<HandlerResult> {
  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) return { status: 400, body: { error: "invalid_request" } };
  const v = parsed.data;

  const order = await getOrderForBuyer(v.publicId, checkoutCookie);
  if (!order || order.razorpayOrderId !== v.razorpay_order_id) return { status: 403, body: { error: "forbidden" } };

  const keySecret = env.razorpayKeySecret;
  if (!keySecret) return { status: 503, body: { error: "payments_not_configured" } };
  if (
    !verifyCheckoutSignature({
      razorpayOrderId: v.razorpay_order_id,
      razorpayPaymentId: v.razorpay_payment_id,
      signature: v.razorpay_signature,
      keySecret,
    })
  ) {
    return { status: 400, body: { error: "invalid_signature" } };
  }

  // Signature proves authenticity; we still fetch the payment server-side to
  // confirm status, amount and currency before granting access.
  const eventId = `verify:${v.razorpay_payment_id}`;
  const shouldProcess = await claimPaymentEvent({
    eventId,
    source: "verify",
    type: "checkout.verify",
    razorpayOrderId: v.razorpay_order_id,
    razorpayPaymentId: v.razorpay_payment_id,
  });

  if (shouldProcess) {
    let payment: RzpPayment;
    try {
      payment = await getGateway().fetchPayment(v.razorpay_payment_id);
    } catch {
      // Could not confirm right now — webhook will resolve it. Show pending.
      return { status: 202, body: { status: "pending", publicId: order.publicId } };
    }
    const result = await applyPaymentState({ razorpayOrderId: v.razorpay_order_id, payment, source: "verify" });
    await completePaymentEvent(eventId, result.outcome, result.order?._id);
    const status = result.order?.status ?? order.status;
    return { status: 200, body: { status: publicStatus(status), publicId: order.publicId } };
  }

  const fresh = await getOrderForBuyer(v.publicId, checkoutCookie);
  return { status: 200, body: { status: publicStatus(fresh?.status ?? order.status), publicId: order.publicId } };
}

export function publicStatus(s: string): "paid" | "pending" | "failed" | "review" | "refunded" {
  if (s === "paid") return "paid";
  if (s === "failed") return "failed";
  if (s === "review") return "review";
  if (s === "refunded") return "refunded";
  return "pending";
}
