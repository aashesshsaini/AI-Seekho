import { hmacSha256Hex, safeEqual } from "../crypto";

/** Minimal Razorpay REST client (orders + payments). No card data ever touches our server. */

export type RzpOrder = { id: string; amount: number; currency: string; receipt: string; status: string };
export type RzpPayment = {
  id: string;
  order_id: string | null;
  amount: number;
  currency: string;
  status: "created" | "authorized" | "captured" | "refunded" | "failed";
  method?: string;
  captured?: boolean;
  error_description?: string | null;
};

export interface RazorpayGateway {
  createOrder(input: { amount: number; currency: "INR"; receipt: string; notes: Record<string, string> }): Promise<RzpOrder>;
  fetchPayment(paymentId: string): Promise<RzpPayment>;
}

export class RazorpayApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "RazorpayApiError";
  }
}

export function createRazorpayGateway(keyId: string, keySecret: string): RazorpayGateway {
  const auth = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
    const res = await fetch(`https://api.razorpay.com/v1${path}`, {
      method,
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      // Never log the response body verbatim; it may echo request data.
      throw new RazorpayApiError(`Razorpay ${method} ${path.split("/")[1]} failed`, res.status);
    }
    return (await res.json()) as T;
  }
  return {
    createOrder: (input) => call<RzpOrder>("POST", "/orders", input),
    fetchPayment: (id) => {
      if (!/^pay_[A-Za-z0-9]+$/.test(id)) throw new RazorpayApiError("Invalid payment id", 400);
      return call<RzpPayment>("GET", `/payments/${id}`);
    },
  };
}

/** Checkout signature: HMAC_SHA256(order_id + "|" + payment_id, key_secret). */
export function verifyCheckoutSignature(params: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  signature: string;
  keySecret: string;
}): boolean {
  if (!params.signature || !/^[a-f0-9]{64}$/.test(params.signature)) return false;
  const expected = hmacSha256Hex(params.keySecret, `${params.razorpayOrderId}|${params.razorpayPaymentId}`);
  return safeEqual(expected, params.signature);
}

/** Webhook signature: HMAC_SHA256(raw body bytes, webhook_secret). Must use the unparsed body. */
export function verifyWebhookSignature(rawBody: string | Buffer, signature: string | null, webhookSecret: string): boolean {
  if (!signature || !/^[a-f0-9]{64}$/.test(signature)) return false;
  const expected = hmacSha256Hex(webhookSecret, rawBody);
  return safeEqual(expected, signature);
}
