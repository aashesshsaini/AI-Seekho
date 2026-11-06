import "server-only";
import { Types } from "mongoose";
import { connectDb } from "../db";
import { env } from "../env";
import { publicOrderId, randomToken, safeEqual, sha256Hex } from "../crypto";
import { Customer, Entitlement, Order, PaymentEvent, Product, type OrderDoc, type OrderStatus } from "../models/commerce";
import { SiteSettings } from "../models/system";
import { downloadPageUrl, ensureEntitlement, revealToken } from "../entitlements";
import { getEmailSender, purchaseEmail } from "../email";
import type { RazorpayGateway, RzpPayment } from "./razorpay";
import { createRazorpayGateway } from "./razorpay";

/* ------------------------------------------------------------- gateway DI */

let gatewayOverride: RazorpayGateway | null = null;
export function setGatewayForTests(g: RazorpayGateway | null): void {
  gatewayOverride = g;
}
export function getGateway(): RazorpayGateway {
  if (gatewayOverride) return gatewayOverride;
  if (!env.razorpayKeyId || !env.razorpayKeySecret) throw new CheckoutError("PAYMENTS_NOT_CONFIGURED");
  return createRazorpayGateway(env.razorpayKeyId, env.razorpayKeySecret);
}

export class CheckoutError extends Error {
  constructor(public code: "PRODUCT_UNAVAILABLE" | "PAYMENTS_NOT_CONFIGURED" | "GATEWAY_ERROR") {
    super(code);
    this.name = "CheckoutError";
  }
}

/* ----------------------------------------------------------- order create */

export type CheckoutInput = { productSlug: string; name: string; email: string; phone?: string };

/**
 * Creates the pending order. The price ALWAYS comes from the database —
 * nothing price-related is accepted from the browser.
 */
export async function createCheckout(input: CheckoutInput) {
  await connectDb();
  const product = await Product.findOne({ slug: input.productSlug, active: true }).lean();
  if (!product) throw new CheckoutError("PRODUCT_UNAVAILABLE");
  const gateway = getGateway();

  const email = input.email.trim().toLowerCase();
  const customer = await Customer.findOneAndUpdate(
    { email },
    { $set: { name: input.name.trim(), ...(input.phone ? { phone: input.phone } : {}) }, $setOnInsert: { email } },
    { upsert: true, returnDocument: "after" },
  );

  const accessSecret = randomToken(24);
  const now = new Date();
  const order = await Order.create({
    publicId: publicOrderId(),
    productId: product._id,
    productSlug: product.slug,
    productName: product.name,
    amountPaise: product.pricePaise,
    currency: "INR",
    mode: env.razorpayMode,
    customerId: customer._id,
    customerEmail: email,
    customerName: input.name.trim(),
    status: "created",
    statusHistory: [{ from: null, to: "created", at: now, source: "checkout" }],
    accessHash: sha256Hex(accessSecret),
  });

  try {
    const rzp = await gateway.createOrder({
      amount: order.amountPaise,
      currency: "INR",
      receipt: order.publicId,
      notes: { order_id: String(order._id), product: product.slug },
    });
    if (rzp.amount !== order.amountPaise || rzp.currency !== "INR") throw new Error("Gateway amount mismatch");
    order.razorpayOrderId = rzp.id;
    await order.save();
    return { order: order.toObject() as OrderDoc, accessSecret, razorpayOrderId: rzp.id };
  } catch {
    await transition(order._id, ["created"], "failed", "checkout", "Payment gateway order creation failed", {
      failureReason: "gateway_order_create_failed",
    });
    throw new CheckoutError("GATEWAY_ERROR");
  }
}

/* -------------------------------------------------------- state machine */

const ALLOWED_FROM: Record<OrderStatus, OrderStatus[]> = {
  created: [],
  authorized: ["created", "failed"],
  // A failed attempt can be retried inside the same Razorpay order.
  paid: ["created", "authorized", "failed"],
  failed: ["created", "authorized"],
  review: ["created", "authorized", "failed"],
  refunded: ["paid", "review"],
};

/** Atomic, conditional status transition. Returns the updated doc or null if not allowed. */
async function transition(
  orderId: Types.ObjectId,
  from: OrderStatus[],
  to: OrderStatus,
  source: "checkout" | "verify" | "webhook" | "admin" | "system",
  note: string,
  extraSet: Record<string, unknown> = {},
): Promise<OrderDoc | null> {
  const allowed = from.filter((f) => ALLOWED_FROM[to].includes(f));
  if (allowed.length === 0) return null;
  const current = await Order.findById(orderId, { status: 1 }).lean();
  if (!current || !allowed.includes(current.status as OrderStatus)) return null;
  return Order.findOneAndUpdate(
    { _id: orderId, status: current.status },
    {
      $set: { status: to, ...extraSet },
      $push: { statusHistory: { from: current.status, to, at: new Date(), source, note: note.slice(0, 300) } },
    },
    { returnDocument: "after" },
  ).lean<OrderDoc>();
}

/* --------------------------------------------------- payment confirmation */

export type ConfirmOutcome =
  | "paid"
  | "already_paid"
  | "authorized"
  | "failed"
  | "ignored"
  | "mismatch"
  | "unknown_order"
  | "refunded";

/**
 * Single entry point used by BOTH the checkout verify callback and the
 * webhook. Safe to call any number of times, in any order.
 */
export async function applyPaymentState(params: {
  razorpayOrderId: string;
  payment: Pick<RzpPayment, "id" | "order_id" | "amount" | "currency" | "status" | "method" | "error_description">;
  source: "verify" | "webhook";
  fullyRefunded?: boolean;
}): Promise<{ outcome: ConfirmOutcome; order: OrderDoc | null }> {
  await connectDb();
  const { payment, source } = params;
  const order = await Order.findOne({ razorpayOrderId: params.razorpayOrderId }).lean<OrderDoc>();
  if (!order) return { outcome: "unknown_order", order: null };

  // Identity, amount and currency must match what WE created.
  if (payment.order_id !== order.razorpayOrderId || payment.amount !== order.amountPaise || payment.currency !== order.currency) {
    if (payment.status === "captured" || payment.status === "authorized") {
      const updated = await transition(order._id, ["created", "authorized", "failed"], "review", source, "Payment did not match order", {
        reviewReason: `mismatch: amount=${payment.amount} currency=${payment.currency}`,
        razorpayPaymentId: payment.id,
      });
      return { outcome: "mismatch", order: updated ?? order };
    }
    return { outcome: "mismatch", order };
  }

  if (params.fullyRefunded || payment.status === "refunded") {
    const updated = await transition(order._id, ["paid", "review"], "refunded", source, "Payment refunded");
    if (updated) {
      await Entitlement.updateOne({ orderId: order._id }, { $set: { revoked: true, revokedReason: "refunded" } });
    }
    return { outcome: "refunded", order: updated ?? order };
  }

  switch (payment.status) {
    case "captured":
      return markPaid(order, payment, source);
    case "authorized": {
      // Auto-capture is expected; until captured we show a pending state.
      const updated = await transition(order._id, ["created", "failed"], "authorized", source, "Payment authorized, awaiting capture", {
        razorpayPaymentId: payment.id,
      });
      return { outcome: order.status === "paid" ? "already_paid" : "authorized", order: updated ?? order };
    }
    case "failed": {
      const updated = await transition(order._id, ["created", "authorized"], "failed", source, "Payment failed", {
        failureReason: (payment.error_description ?? "payment_failed").slice(0, 300),
      });
      return { outcome: order.status === "paid" ? "already_paid" : "failed", order: updated ?? order };
    }
    default:
      return { outcome: "ignored", order };
  }
}

async function markPaid(
  order: OrderDoc,
  payment: Pick<RzpPayment, "id" | "method">,
  source: "verify" | "webhook",
): Promise<{ outcome: ConfirmOutcome; order: OrderDoc }> {
  const updated = await transition(order._id, ["created", "authorized", "failed"], "paid", source, `Payment ${payment.id} captured`, {
    paidAt: new Date(),
    razorpayPaymentId: payment.id,
    paymentMethod: payment.method ?? "",
    failureReason: "",
  });
  const transitioned = Boolean(updated);
  const fresh = updated ?? (await Order.findById(order._id).lean<OrderDoc>())!;
  if (fresh.status !== "paid") return { outcome: "ignored", order: fresh };

  // Always (re)ensure the entitlement — idempotent via unique index.
  const { entitlement } = await ensureEntitlement(fresh);
  if (transitioned) {
    await Customer.updateOne({ _id: fresh.customerId }, { $inc: { paidOrders: 1 } });
    await sendPurchaseEmailOnce(fresh._id, entitlement.tokenCiphertext);
  }
  return { outcome: transitioned ? "paid" : "already_paid", order: fresh };
}

/** Claims the email slot atomically so concurrent processors cannot double-send. */
export async function sendPurchaseEmailOnce(orderId: Types.ObjectId, tokenCiphertext: string): Promise<void> {
  const sender = getEmailSender();
  if (!sender.configured) {
    await Order.updateOne({ _id: orderId }, { $set: { "delivery.emailStatus": "not_configured" } });
    return;
  }
  const claimed = await Order.findOneAndUpdate(
    { _id: orderId, "delivery.emailStatus": { $in: ["not_applicable", "not_configured", "failed"] } },
    { $set: { "delivery.emailStatus": "pending" } },
    { returnDocument: "after" },
  ).lean<OrderDoc>();
  if (!claimed) return;
  const token = revealToken({ tokenCiphertext });
  if (!token) {
    await Order.updateOne({ _id: orderId }, { $set: { "delivery.emailStatus": "failed", "delivery.emailError": "token" } });
    return;
  }
  const settings = await SiteSettings.findOne({ key: "site" }, { supportEmail: 1 }).lean();
  const ent = await Entitlement.findOne({ orderId }, { tokenExpiresAt: 1 }).lean();
  const msg = purchaseEmail({
    name: claimed.customerName,
    productName: claimed.productName,
    orderRef: claimed.publicId,
    downloadUrl: downloadPageUrl(token),
    expiresOn: (ent?.tokenExpiresAt ?? new Date()).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }),
    supportEmail: settings?.supportEmail ?? "",
  });
  const result = await sender.send({ to: claimed.customerEmail, ...msg });
  await Order.updateOne(
    { _id: orderId },
    {
      $set:
        result.status === "sent"
          ? { "delivery.emailStatus": "sent", "delivery.emailSentAt": new Date(), "delivery.emailError": "" }
          : { "delivery.emailStatus": result.status === "failed" ? "failed" : "not_configured", "delivery.emailError": result.status === "failed" ? result.error : "" },
    },
  );
}

/* ---------------------------------------------------- event idempotency */

/**
 * Records a payment event. Returns false if the same event was already
 * processed successfully (duplicate delivery), true if it should be processed.
 */
export async function claimPaymentEvent(doc: {
  eventId: string;
  source: "webhook" | "verify";
  type: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  amountPaise?: number;
  currency?: string;
  paymentStatus?: string;
}): Promise<boolean> {
  await connectDb();
  const { eventId, ...rest } = doc;
  try {
    const existing = await PaymentEvent.findOneAndUpdate(
      { eventId },
      { $setOnInsert: { ...rest, outcome: "received" } },
      { upsert: true, returnDocument: "before" },
    ).lean();
    return !existing || !existing.processedAt;
  } catch (err) {
    // Concurrent first delivery raced us on the unique index: treat as in-flight duplicate.
    if ((err as { code?: number }).code === 11000) {
      const existing = await PaymentEvent.findOne({ eventId }).lean();
      return !existing?.processedAt;
    }
    throw err;
  }
}

export async function completePaymentEvent(eventId: string, outcome: string, orderId?: Types.ObjectId | null): Promise<void> {
  await PaymentEvent.updateOne({ eventId }, { $set: { outcome, processedAt: new Date(), ...(orderId ? { orderId } : {}) } });
}

/* -------------------------------------------------- buyer access (cookie) */

export const CHECKOUT_COOKIE = "ais_checkout";

export function encodeCheckoutCookie(publicId: string, secret: string): string {
  return `${publicId}~${secret}`;
}

export function parseCheckoutCookie(value: string | undefined): { publicId: string; secret: string }[] {
  if (!value) return [];
  // Up to 5 recent checkouts, "|" separated (newest first).
  return value
    .split("|")
    .slice(0, 5)
    .map((part) => {
      const [publicId, secret] = part.split("~");
      return { publicId, secret };
    })
    .filter((p) => /^AIS-[A-Z0-9]{5}-[A-Z0-9]{5}$/.test(p.publicId ?? "") && /^[A-Za-z0-9_-]{20,64}$/.test(p.secret ?? ""));
}

export function appendCheckoutCookie(existing: string | undefined, publicId: string, secret: string): string {
  const prior = parseCheckoutCookie(existing).filter((p) => p.publicId !== publicId);
  return [encodeCheckoutCookie(publicId, secret), ...prior.map((p) => encodeCheckoutCookie(p.publicId, p.secret))].slice(0, 5).join("|");
}

/** Returns the order only if the caller holds the matching checkout secret. */
export async function getOrderForBuyer(publicId: string, cookieValue: string | undefined): Promise<OrderDoc | null> {
  const entry = parseCheckoutCookie(cookieValue).find((p) => p.publicId === publicId);
  if (!entry) return null;
  await connectDb();
  const order = await Order.findOne({ publicId }).lean<OrderDoc>();
  if (!order) return null;
  return safeEqual(order.accessHash, sha256Hex(entry.secret)) ? order : null;
}

export function isObjectId(v: string): boolean {
  return Types.ObjectId.isValid(v) && /^[a-f0-9]{24}$/.test(v);
}
