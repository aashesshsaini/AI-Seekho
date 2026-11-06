import { createHmac } from "node:crypto";
import { Product, ProductAsset } from "@/lib/models/commerce";
import type { RazorpayGateway, RzpPayment } from "@/lib/payments/razorpay";

export const KEY_SECRET = "test_key_secret";
export const WEBHOOK_SECRET = "test_webhook_secret";

export async function seedProduct(overrides: Partial<{ pricePaise: number; active: boolean }> = {}) {
  const p = await Product.create({ slug: "ai-se-smart-kaam", name: "AI SE SMART KAAM", pricePaise: 19900, active: true, ...overrides });
  await ProductAsset.create({
    productId: p._id,
    storageKey: "ai-se-smart-kaam/v4/test.zip",
    filename: "test.zip",
    label: "Complete package",
    contentType: "application/zip",
    sizeBytes: 11,
    sha256: "a".repeat(64),
    sortOrder: 0,
  });
  return p;
}

/** In-memory Razorpay double. Records calls; payments are set by the test. */
export function mockGateway() {
  let n = 0;
  const payments = new Map<string, RzpPayment>();
  const calls: { createOrder: { amount: number; currency: string; receipt: string }[]; fetchPayment: string[] } = { createOrder: [], fetchPayment: [] };
  const gw: RazorpayGateway & { payments: typeof payments; calls: typeof calls; failCreate?: boolean; failFetch?: boolean } = {
    payments,
    calls,
    async createOrder(input) {
      calls.createOrder.push(input);
      if (gw.failCreate) throw new Error("gateway down");
      return { id: `order_TEST${++n}`, amount: input.amount, currency: input.currency, receipt: input.receipt, status: "created" };
    },
    async fetchPayment(id) {
      calls.fetchPayment.push(id);
      if (gw.failFetch) throw new Error("gateway down");
      const p = payments.get(id);
      if (!p) throw new Error("not found");
      return p;
    },
  };
  return gw;
}

export function checkoutSignature(orderId: string, paymentId: string, secret = KEY_SECRET) {
  return createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
}

export function webhookRequest(event: string, payment: Partial<RzpPayment> & { amount_refunded?: number }, eventId: string, secret = WEBHOOK_SECRET) {
  const body = JSON.stringify({ entity: "event", event, payload: { payment: { entity: { method: "upi", ...payment } } }, created_at: 1 });
  const sig = createHmac("sha256", secret).update(body).digest("hex");
  const headers = new Headers({ "x-razorpay-signature": sig, "x-razorpay-event-id": eventId, "content-type": "application/json" });
  return { body, headers };
}
