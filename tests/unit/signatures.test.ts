import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { verifyCheckoutSignature, verifyWebhookSignature } from "@/lib/payments/razorpay";
import { signFileLink, verifyFileLink, FILE_LINK_TTL_SECONDS } from "@/lib/entitlements";
import { checkoutRequestSchema } from "@/lib/payments/schemas";
import { appendCheckoutCookie, parseCheckoutCookie } from "@/lib/payments/service";
import { decryptString, encryptString } from "@/lib/crypto";

const hmac = (k: string, m: string) => createHmac("sha256", k).update(m).digest("hex");

describe("Razorpay checkout signature", () => {
  const base = { razorpayOrderId: "order_ABC", razorpayPaymentId: "pay_XYZ", keySecret: "s3cret" };
  it("accepts a valid signature", () => {
    expect(verifyCheckoutSignature({ ...base, signature: hmac("s3cret", "order_ABC|pay_XYZ") })).toBe(true);
  });
  it("rejects wrong secret, swapped ids and garbage", () => {
    expect(verifyCheckoutSignature({ ...base, signature: hmac("other", "order_ABC|pay_XYZ") })).toBe(false);
    expect(verifyCheckoutSignature({ ...base, signature: hmac("s3cret", "pay_XYZ|order_ABC") })).toBe(false);
    expect(verifyCheckoutSignature({ ...base, razorpayPaymentId: "pay_OTHER", signature: hmac("s3cret", "order_ABC|pay_XYZ") })).toBe(false);
    expect(verifyCheckoutSignature({ ...base, signature: "" })).toBe(false);
    expect(verifyCheckoutSignature({ ...base, signature: "zz" })).toBe(false);
  });
});

describe("Razorpay webhook signature (raw body)", () => {
  const body = '{"event":"payment.captured","payload":{"payment":{"entity":{"amount":19900}}}}';
  it("accepts a signature over the exact raw body", () => {
    expect(verifyWebhookSignature(body, hmac("wh", body), "wh")).toBe(true);
  });
  it("rejects tampered body, re-serialised JSON, missing header", () => {
    expect(verifyWebhookSignature(body.replace("19900", "100"), hmac("wh", body), "wh")).toBe(false);
    expect(verifyWebhookSignature(JSON.stringify(JSON.parse(body), null, 2), hmac("wh", body), "wh")).toBe(false);
    expect(verifyWebhookSignature(body, null, "wh")).toBe(false);
    expect(verifyWebhookSignature(body, hmac("wrong", body), "wh")).toBe(false);
  });
});

describe("signed file links", () => {
  const e = "a".repeat(24);
  const a = "b".repeat(24);
  it("verifies a fresh link", () => {
    const url = new URL("http://x" + signFileLink(e, a));
    expect(verifyFileLink(url.searchParams)).toEqual({ ok: true, entitlementId: e, assetId: a });
  });
  it("rejects expired links", () => {
    const url = new URL("http://x" + signFileLink(e, a, Date.now() - (FILE_LINK_TTL_SECONDS + 5) * 1000));
    expect(verifyFileLink(url.searchParams)).toEqual({ ok: false, reason: "denied_expired" });
  });
  it("rejects tampering with any parameter", () => {
    const url = new URL("http://x" + signFileLink(e, a));
    for (const [k, v] of [["e", "c".repeat(24)], ["a", "c".repeat(24)], ["x", String(Number(url.searchParams.get("x")) + 9999)], ["s", "0".repeat(64)]]) {
      const p = new URLSearchParams(url.searchParams);
      p.set(k, v);
      expect(verifyFileLink(p).ok).toBe(false);
    }
  });
});

describe("checkout request validation", () => {
  const ok = { productSlug: "ai-se-smart-kaam", name: "Asha", email: "a@example.com", agree: true };
  it("accepts a valid request", () => expect(checkoutRequestSchema.safeParse(ok).success).toBe(true));
  it("rejects client-supplied price/amount fields (price tampering)", () => {
    expect(checkoutRequestSchema.safeParse({ ...ok, amount: 100 }).success).toBe(false);
    expect(checkoutRequestSchema.safeParse({ ...ok, pricePaise: 1 }).success).toBe(false);
    expect(checkoutRequestSchema.safeParse({ ...ok, currency: "USD" }).success).toBe(false);
  });
  it("rejects invalid input", () => {
    expect(checkoutRequestSchema.safeParse({ ...ok, email: "nope" }).success).toBe(false);
    expect(checkoutRequestSchema.safeParse({ ...ok, agree: false }).success).toBe(false);
    expect(checkoutRequestSchema.safeParse({ ...ok, productSlug: "../etc" }).success).toBe(false);
    expect(checkoutRequestSchema.safeParse({ ...ok, name: "" }).success).toBe(false);
  });
});

describe("checkout cookie + token encryption", () => {
  it("keeps newest-first list of at most 5 checkouts and drops malformed entries", () => {
    let c: string | undefined;
    for (let i = 0; i < 7; i++) c = appendCheckoutCookie(c, `AIS-AAAA${i}-BBBBB`, "s".repeat(32));
    const parsed = parseCheckoutCookie(c);
    expect(parsed).toHaveLength(5);
    expect(parsed[0].publicId).toBe("AIS-AAAA6-BBBBB");
    expect(parseCheckoutCookie("garbage|AIS-x~y")).toEqual([]);
  });
  it("round-trips encrypted tokens and rejects tampering / wrong key", () => {
    const ct = encryptString("token123", "k".repeat(40), "p");
    expect(decryptString(ct, "k".repeat(40), "p")).toBe("token123");
    expect(decryptString(ct, "j".repeat(40), "p")).toBeNull();
    expect(decryptString(ct.slice(0, -2) + "AA", "k".repeat(40), "p")).toBeNull();
  });
});
