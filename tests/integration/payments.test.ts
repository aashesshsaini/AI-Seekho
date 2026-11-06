import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setupTestDb } from "../helpers/db";
import { checkoutSignature, mockGateway, seedProduct, webhookRequest } from "../helpers/fixtures";
import { Customer, Entitlement, Order, PaymentEvent, Product } from "@/lib/models/commerce";
import { CheckoutError, createCheckout, encodeCheckoutCookie, getOrderForBuyer, setGatewayForTests } from "@/lib/payments/service";
import { handleCheckoutVerify, handleRazorpayWebhook } from "@/lib/payments/handlers";
import { setEmailSenderForTests, type EmailMessage } from "@/lib/email";

setupTestDb();

let gw: ReturnType<typeof mockGateway>;
const sent: EmailMessage[] = [];
beforeEach(() => {
  gw = mockGateway();
  setGatewayForTests(gw);
  sent.length = 0;
  setEmailSenderForTests({ configured: true, send: async (m) => (sent.push(m), { status: "sent" }) });
});
afterEach(() => {
  setGatewayForTests(null);
  setEmailSenderForTests(null);
});

const buyer = { productSlug: "ai-se-smart-kaam", name: "Asha", email: "Asha@Example.com" };

async function startCheckout() {
  await seedProduct();
  const r = await createCheckout(buyer);
  return { ...r, cookie: encodeCheckoutCookie(r.order.publicId, r.accessSecret) };
}

function captured(rzpOrderId: string, payId = "pay_OK1", amount = 19900) {
  return { id: payId, order_id: rzpOrderId, amount, currency: "INR", status: "captured" as const, method: "upi" };
}

describe("order creation & pricing", () => {
  it("uses the database price, not anything from the client", async () => {
    await seedProduct({ pricePaise: 24900 });
    const { order } = await createCheckout(buyer);
    expect(order.amountPaise).toBe(24900);
    expect(gw.calls.createOrder[0]).toMatchObject({ amount: 24900, currency: "INR", receipt: order.publicId });
    expect(order.status).toBe("created");
    expect(order.customerEmail).toBe("asha@example.com");
    expect(order.accessHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("picks up admin price changes for new orders", async () => {
    const p = await seedProduct();
    await Product.updateOne({ _id: p._id }, { pricePaise: 9900 });
    const { order } = await createCheckout(buyer);
    expect(order.amountPaise).toBe(9900);
  });

  it("refuses inactive or unknown products", async () => {
    await seedProduct({ active: false });
    await expect(createCheckout(buyer)).rejects.toMatchObject({ code: "PRODUCT_UNAVAILABLE" });
    await expect(createCheckout({ ...buyer, productSlug: "nope" })).rejects.toBeInstanceOf(CheckoutError);
  });

  it("marks the order failed if the gateway order cannot be created", async () => {
    await seedProduct();
    gw.failCreate = true;
    await expect(createCheckout(buyer)).rejects.toMatchObject({ code: "GATEWAY_ERROR" });
    const o = await Order.findOne().lean();
    expect(o?.status).toBe("failed");
  });

  it("does not treat a guessed order id as authorization", async () => {
    const { order } = await startCheckout();
    expect(await getOrderForBuyer(order.publicId, undefined)).toBeNull();
    expect(await getOrderForBuyer(order.publicId, encodeCheckoutCookie(order.publicId, "x".repeat(32)))).toBeNull();
  });
});

describe("checkout verify (browser callback)", () => {
  it("marks paid only after signature AND server-side payment fetch", async () => {
    const { order, razorpayOrderId, cookie } = await startCheckout();
    gw.payments.set("pay_OK1", captured(razorpayOrderId));
    const res = await handleCheckoutVerify(
      { publicId: order.publicId, razorpay_order_id: razorpayOrderId, razorpay_payment_id: "pay_OK1", razorpay_signature: checkoutSignature(razorpayOrderId, "pay_OK1") },
      cookie,
    );
    expect(res).toMatchObject({ status: 200, body: { status: "paid" } });
    expect(gw.calls.fetchPayment).toEqual(["pay_OK1"]);
    expect(await Entitlement.countDocuments()).toBe(1);
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("asha@example.com");
    const o = await Order.findById(order._id).lean();
    expect(o?.statusHistory.map((h) => h.to)).toEqual(["created", "paid"]);
  });

  it("rejects an invalid signature and leaves the order untouched", async () => {
    const { order, razorpayOrderId, cookie } = await startCheckout();
    gw.payments.set("pay_OK1", captured(razorpayOrderId));
    const res = await handleCheckoutVerify(
      { publicId: order.publicId, razorpay_order_id: razorpayOrderId, razorpay_payment_id: "pay_OK1", razorpay_signature: checkoutSignature(razorpayOrderId, "pay_OK1", "wrong") },
      cookie,
    );
    expect(res.status).toBe(400);
    expect((await Order.findById(order._id).lean())?.status).toBe("created");
    expect(await Entitlement.countDocuments()).toBe(0);
  });

  it("forbids verifying without the buyer's checkout cookie", async () => {
    const { order, razorpayOrderId } = await startCheckout();
    const res = await handleCheckoutVerify(
      { publicId: order.publicId, razorpay_order_id: razorpayOrderId, razorpay_payment_id: "pay_OK1", razorpay_signature: checkoutSignature(razorpayOrderId, "pay_OK1") },
      undefined,
    );
    expect(res.status).toBe(403);
  });

  it("shows pending (not success) when the payment cannot be confirmed yet", async () => {
    const { order, razorpayOrderId, cookie } = await startCheckout();
    gw.failFetch = true;
    const res = await handleCheckoutVerify(
      { publicId: order.publicId, razorpay_order_id: razorpayOrderId, razorpay_payment_id: "pay_OK1", razorpay_signature: checkoutSignature(razorpayOrderId, "pay_OK1") },
      cookie,
    );
    expect(res).toMatchObject({ status: 202, body: { status: "pending" } });
    expect((await Order.findById(order._id).lean())?.status).toBe("created");
    // A later retry (once the gateway is reachable) is still processed.
    gw.failFetch = false;
    gw.payments.set("pay_OK1", captured(razorpayOrderId));
    const again = await handleCheckoutVerify(
      { publicId: order.publicId, razorpay_order_id: razorpayOrderId, razorpay_payment_id: "pay_OK1", razorpay_signature: checkoutSignature(razorpayOrderId, "pay_OK1") },
      cookie,
    );
    expect(again.body.status).toBe("paid");
  });

  it("treats an authorized-but-not-captured payment as pending", async () => {
    const { order, razorpayOrderId, cookie } = await startCheckout();
    gw.payments.set("pay_A", { ...captured(razorpayOrderId, "pay_A"), status: "authorized" });
    const res = await handleCheckoutVerify(
      { publicId: order.publicId, razorpay_order_id: razorpayOrderId, razorpay_payment_id: "pay_A", razorpay_signature: checkoutSignature(razorpayOrderId, "pay_A") },
      cookie,
    );
    expect(res.body.status).toBe("pending");
    expect(await Entitlement.countDocuments()).toBe(0);
  });

  it("flags an incorrect amount for review and grants nothing", async () => {
    const { order, razorpayOrderId, cookie } = await startCheckout();
    gw.payments.set("pay_LOW", captured(razorpayOrderId, "pay_LOW", 100));
    const res = await handleCheckoutVerify(
      { publicId: order.publicId, razorpay_order_id: razorpayOrderId, razorpay_payment_id: "pay_LOW", razorpay_signature: checkoutSignature(razorpayOrderId, "pay_LOW") },
      cookie,
    );
    expect(res.body.status).toBe("review");
    expect(await Entitlement.countDocuments()).toBe(0);
    expect(sent).toHaveLength(0);
  });
});

describe("webhooks", () => {
  it("rejects an invalid signature", async () => {
    const { razorpayOrderId } = await startCheckout();
    const { body, headers } = webhookRequest("payment.captured", captured(razorpayOrderId), "evt_1", "wrong-secret");
    expect((await handleRazorpayWebhook(body, headers)).status).toBe(400);
    expect(await PaymentEvent.countDocuments()).toBe(0);
  });

  it("resolves the order even if the browser never returns", async () => {
    const { order, razorpayOrderId } = await startCheckout();
    const { body, headers } = webhookRequest("payment.captured", captured(razorpayOrderId), "evt_1");
    expect((await handleRazorpayWebhook(body, headers)).body).toMatchObject({ outcome: "paid" });
    expect((await Order.findById(order._id).lean())?.status).toBe("paid");
    expect(await Entitlement.countDocuments({ orderId: order._id })).toBe(1);
  });

  it("is idempotent under duplicate delivery of the same event", async () => {
    const { razorpayOrderId } = await startCheckout();
    const { body, headers } = webhookRequest("payment.captured", captured(razorpayOrderId), "evt_dup");
    await handleRazorpayWebhook(body, headers);
    const second = await handleRazorpayWebhook(body, headers);
    expect(second.body).toMatchObject({ duplicate: true });
    expect(await Entitlement.countDocuments()).toBe(1);
    expect(sent).toHaveLength(1);
    expect((await Customer.findOne().lean())?.paidOrders).toBe(1);
  });

  it("stays consistent when payment.captured and order.paid race concurrently", async () => {
    const { razorpayOrderId } = await startCheckout();
    const a = webhookRequest("payment.captured", captured(razorpayOrderId), "evt_a");
    const b = webhookRequest("order.paid", captured(razorpayOrderId), "evt_b");
    const c = webhookRequest("payment.captured", captured(razorpayOrderId), "evt_a");
    await Promise.all([handleRazorpayWebhook(a.body, a.headers), handleRazorpayWebhook(b.body, b.headers), handleRazorpayWebhook(c.body, c.headers)]);
    expect(await Entitlement.countDocuments()).toBe(1);
    expect(sent).toHaveLength(1);
    expect((await Customer.findOne().lean())?.paidOrders).toBe(1);
    const o = await Order.findOne().lean();
    expect(o?.statusHistory.filter((h) => h.to === "paid")).toHaveLength(1);
  });

  it("webhook first, then browser verify → already paid, no double grant", async () => {
    const { order, razorpayOrderId, cookie } = await startCheckout();
    const w = webhookRequest("payment.captured", captured(razorpayOrderId), "evt_1");
    await handleRazorpayWebhook(w.body, w.headers);
    gw.payments.set("pay_OK1", captured(razorpayOrderId));
    const res = await handleCheckoutVerify(
      { publicId: order.publicId, razorpay_order_id: razorpayOrderId, razorpay_payment_id: "pay_OK1", razorpay_signature: checkoutSignature(razorpayOrderId, "pay_OK1") },
      cookie,
    );
    expect(res.body.status).toBe("paid");
    expect(await Entitlement.countDocuments()).toBe(1);
    expect(sent).toHaveLength(1);
  });

  it("handles out-of-order events: a late payment.failed never downgrades a paid order", async () => {
    const { order, razorpayOrderId } = await startCheckout();
    const ok = webhookRequest("payment.captured", captured(razorpayOrderId), "evt_ok");
    const fail = webhookRequest("payment.failed", { ...captured(razorpayOrderId, "pay_F"), status: "failed", error_description: "declined" }, "evt_fail");
    await handleRazorpayWebhook(ok.body, ok.headers);
    await handleRazorpayWebhook(fail.body, fail.headers);
    expect((await Order.findById(order._id).lean())?.status).toBe("paid");
  });

  it("failed attempt then successful retry in the same order → paid", async () => {
    const { order, razorpayOrderId } = await startCheckout();
    const fail = webhookRequest("payment.failed", { ...captured(razorpayOrderId, "pay_F"), status: "failed", error_description: "insufficient funds" }, "evt_f");
    await handleRazorpayWebhook(fail.body, fail.headers);
    const o1 = await Order.findById(order._id).lean();
    expect(o1?.status).toBe("failed");
    expect(o1?.failureReason).toBe("insufficient funds");
    expect(await Entitlement.countDocuments()).toBe(0);
    const ok = webhookRequest("payment.captured", captured(razorpayOrderId, "pay_OK2"), "evt_ok2");
    await handleRazorpayWebhook(ok.body, ok.headers);
    expect((await Order.findById(order._id).lean())?.status).toBe("paid");
  });

  it("rejects mismatched amount/currency from a signed webhook", async () => {
    const { order, razorpayOrderId } = await startCheckout();
    const w = webhookRequest("payment.captured", { ...captured(razorpayOrderId), currency: "USD" }, "evt_cur");
    expect((await handleRazorpayWebhook(w.body, w.headers)).body).toMatchObject({ outcome: "mismatch" });
    expect((await Order.findById(order._id).lean())?.status).toBe("review");
    expect(await Entitlement.countDocuments()).toBe(0);
  });

  it("ignores events for unknown orders and unhandled event types", async () => {
    await startCheckout();
    const w = webhookRequest("payment.captured", captured("order_UNKNOWN"), "evt_u");
    expect((await handleRazorpayWebhook(w.body, w.headers)).body).toMatchObject({ outcome: "unknown_order" });
    const x = webhookRequest("payment.dispute.created", captured("order_UNKNOWN"), "evt_x");
    expect((await handleRazorpayWebhook(x.body, x.headers)).body).toMatchObject({ ignored: "payment.dispute.created" });
  });

  it("full refund revokes the entitlement", async () => {
    const { order, razorpayOrderId } = await startCheckout();
    const ok = webhookRequest("payment.captured", captured(razorpayOrderId), "evt_ok");
    await handleRazorpayWebhook(ok.body, ok.headers);
    const refund = webhookRequest("refund.processed", { ...captured(razorpayOrderId), status: "refunded", amount_refunded: 19900 }, "evt_r");
    await handleRazorpayWebhook(refund.body, refund.headers);
    expect((await Order.findById(order._id).lean())?.status).toBe("refunded");
    expect((await Entitlement.findOne({ orderId: order._id }).lean())?.revoked).toBe(true);
  });

  it("reprocesses a retried event whose first attempt crashed", async () => {
    const { order, razorpayOrderId } = await startCheckout();
    const w = webhookRequest("payment.captured", captured(razorpayOrderId), "evt_crash");
    // Simulate a crash after the event was recorded but before processing finished.
    await PaymentEvent.create({ eventId: "evt_crash", source: "webhook", type: "payment.captured", outcome: "received" });
    const res = await handleRazorpayWebhook(w.body, w.headers);
    expect(res.body).toMatchObject({ outcome: "paid" });
    expect((await Order.findById(order._id).lean())?.status).toBe("paid");
  });
});
