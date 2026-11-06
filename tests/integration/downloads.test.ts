import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setupTestDb } from "../helpers/db";
import { mockGateway, seedProduct, webhookRequest } from "../helpers/fixtures";
import { DownloadAudit, Entitlement, Order, ProductAsset, RecoveryRequest } from "@/lib/models/commerce";
import { createCheckout, setGatewayForTests } from "@/lib/payments/service";
import { handleRazorpayWebhook } from "@/lib/payments/handlers";
import { findEntitlementByToken, revealToken, signFileLink, FILE_LINK_TTL_SECONDS } from "@/lib/entitlements";
import { serveDownload } from "@/lib/download";
import { setStorageForTests, type PrivateStorage } from "@/lib/storage";
import { setEmailSenderForTests, type EmailMessage } from "@/lib/email";
import { GENERIC_RECOVERY_MESSAGE, requestRecovery } from "@/lib/recovery";

setupTestDb();

const files = new Map<string, string>([["ai-se-smart-kaam/v4/test.zip", "ZIP-CONTENT"]]);
const storage: PrivateStorage = {
  name: "mock",
  async stat(key) {
    const v = files.get(key);
    return v === undefined ? null : { size: v.length };
  },
  async open(key) {
    const v = files.get(key);
    if (v === undefined) return null;
    return { body: new Blob([v]).stream(), size: v.length };
  },
};
const sent: EmailMessage[] = [];

beforeEach(() => {
  setGatewayForTests(mockGateway());
  setStorageForTests(storage);
  sent.length = 0;
  setEmailSenderForTests({ configured: false, send: async () => ({ status: "not_configured" }) });
});
afterEach(() => {
  setGatewayForTests(null);
  setStorageForTests(null);
  setEmailSenderForTests(null);
});

async function paidOrder() {
  await seedProduct();
  const { order, razorpayOrderId } = await createCheckout({ productSlug: "ai-se-smart-kaam", name: "Ravi", email: "ravi@example.com" });
  const w = webhookRequest("payment.captured", { id: "pay_1", order_id: razorpayOrderId, amount: 19900, currency: "INR", status: "captured" }, "evt_1");
  await handleRazorpayWebhook(w.body, w.headers);
  const ent = (await Entitlement.findOne({ orderId: order._id }).lean())!;
  const asset = (await ProductAsset.findOne().lean())!;
  return { order, ent, asset };
}

const url = (path: string) => new URL("http://localhost" + path);

describe("entitlements", () => {
  it("are created only for verified payments", async () => {
    await seedProduct();
    await createCheckout({ productSlug: "ai-se-smart-kaam", name: "Ravi", email: "ravi@example.com" });
    expect(await Entitlement.countDocuments()).toBe(0);
  });

  it("store only a hash of the bearer token, and the token resolves", async () => {
    const { ent } = await paidOrder();
    const token = revealToken(ent)!;
    expect(ent.tokenHash).not.toContain(token);
    expect(await findEntitlementByToken(token)).toMatchObject({ ok: true });
    expect(await findEntitlementByToken("A".repeat(43))).toEqual({ ok: false, reason: "not_found" });
    expect(await findEntitlementByToken("short")).toEqual({ ok: false, reason: "not_found" });
  });

  it("expired tokens are rejected", async () => {
    const { ent } = await paidOrder();
    await Entitlement.updateOne({ _id: ent._id }, { tokenExpiresAt: new Date(Date.now() - 1000) });
    expect(await findEntitlementByToken(revealToken(ent)!)).toEqual({ ok: false, reason: "expired" });
  });
});

describe("secure downloads", () => {
  it("serves the private file for a valid signed link", async () => {
    const { ent, asset } = await paidOrder();
    const res = await serveDownload(url(signFileLink(String(ent._id), String(asset._id))), "1.2.3.4");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("ZIP-CONTENT");
    expect(res.headers.get("content-disposition")).toContain('attachment; filename="test.zip"');
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect((await Entitlement.findById(ent._id).lean())?.downloadCount).toBe(1);
    expect(await DownloadAudit.countDocuments({ outcome: "served" })).toBe(1);
  });

  it("rejects unsigned / tampered links (e.g. guessed ids)", async () => {
    const { ent, asset } = await paidOrder();
    const res = await serveDownload(url(`/api/download?e=${ent._id}&a=${asset._id}&x=9999999999&s=${"0".repeat(64)}`), "1.2.3.4");
    expect(res.status).toBe(403);
    expect(await DownloadAudit.countDocuments({ outcome: "denied_signature" })).toBe(1);
  });

  it("rejects expired file links", async () => {
    const { ent, asset } = await paidOrder();
    const res = await serveDownload(url(signFileLink(String(ent._id), String(asset._id), Date.now() - (FILE_LINK_TTL_SECONDS + 60) * 1000)), "1.2.3.4");
    expect(res.status).toBe(410);
  });

  it("rejects revoked entitlements and unpaid orders", async () => {
    const { ent, asset, order } = await paidOrder();
    await Entitlement.updateOne({ _id: ent._id }, { revoked: true });
    expect((await serveDownload(url(signFileLink(String(ent._id), String(asset._id))), "1.2.3.4")).status).toBe(403);
    await Entitlement.updateOne({ _id: ent._id }, { revoked: false });
    await Order.updateOne({ _id: order._id }, { status: "review" });
    expect((await serveDownload(url(signFileLink(String(ent._id), String(asset._id))), "1.2.3.4")).status).toBe(403);
  });

  it("does not serve another product's asset with a valid entitlement", async () => {
    const { ent } = await paidOrder();
    const other = await ProductAsset.create({ productId: ent.orderId, storageKey: "other/x.zip", filename: "x.zip", label: "x", contentType: "application/zip", sizeBytes: 1, sha256: "b".repeat(64) });
    expect((await serveDownload(url(signFileLink(String(ent._id), String(other._id))), "1.2.3.4")).status).toBe(404);
  });

  it("enforces the download limit but allows reasonable retries", async () => {
    const { ent, asset } = await paidOrder();
    await Entitlement.updateOne({ _id: ent._id }, { maxDownloads: 2 });
    const link = () => url(signFileLink(String(ent._id), String(asset._id)));
    expect((await serveDownload(link(), "ip")).status).toBe(200);
    expect((await serveDownload(link(), "ip")).status).toBe(200);
    expect((await serveDownload(link(), "ip")).status).toBe(429);
  });

  it("does not consume a download when storage is unavailable", async () => {
    const { ent, asset } = await paidOrder();
    await ProductAsset.updateOne({ _id: asset._id }, { storageKey: "missing/file.zip" });
    expect((await serveDownload(url(signFileLink(String(ent._id), String(asset._id))), "ip")).status).toBe(503);
    expect((await Entitlement.findById(ent._id).lean())?.downloadCount).toBe(0);
  });
});

describe("order recovery", () => {
  it("returns the same generic response whether or not a purchase exists (no enumeration)", async () => {
    const { order } = await paidOrder();
    const match = await requestRecovery({ email: "ravi@example.com", orderRef: order.publicId });
    const wrongEmail = await requestRecovery({ email: "someone@example.com", orderRef: order.publicId });
    const unknown = await requestRecovery({ email: "ravi@example.com", orderRef: "AIS-ZZZZZ-ZZZZZ" });
    expect(match).toEqual(wrongEmail);
    expect(match).toEqual(unknown);
    expect(match.body.message).toBe(GENERIC_RECOVERY_MESSAGE);
  });

  it("queues a matched request for admin when email is not configured", async () => {
    const { order } = await paidOrder();
    await requestRecovery({ email: "RAVI@example.com", orderRef: order.publicId.toLowerCase() });
    expect(await RecoveryRequest.countDocuments({ outcome: "pending_admin" })).toBe(1);
  });

  it("emails the link to the purchase email when email is configured, rotating an expired token", async () => {
    const { order, ent } = await paidOrder();
    setEmailSenderForTests({ configured: true, send: async (m) => (sent.push(m), { status: "sent" }) });
    await Entitlement.updateOne({ _id: ent._id }, { tokenExpiresAt: new Date(Date.now() - 1000) });
    await requestRecovery({ email: "ravi@example.com", orderRef: order.publicId });
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("ravi@example.com");
    const fresh = (await Entitlement.findById(ent._id).lean())!;
    expect(fresh.tokenHash).not.toBe(ent.tokenHash);
    expect(fresh.tokenExpiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(sent[0].text).toContain(revealToken(fresh)!);
  });

  it("validates input", async () => {
    expect((await requestRecovery({ email: "x", orderRef: "AIS-1" })).status).toBe(400);
  });
});
