/**
 * Local end-to-end smoke test against a RUNNING server (no Razorpay keys needed):
 * creates a pending order directly in the DB (standing in for Razorpay order
 * creation), sends a correctly signed webhook over HTTP, then downloads the
 * real ZIP through the signed-link route and checks its SHA-256.
 * Usage: BASE=http://localhost:3100 npx tsx --env-file=.env.local scripts/smoke-local.ts
 */
import { createHash, createHmac, randomBytes } from "node:crypto";
import mongoose from "mongoose";
import { Customer, Order, Product } from "../src/lib/models/commerce";

const BASE = process.env.BASE ?? "http://localhost:3100";
const sha = (b: string | Buffer) => createHash("sha256").update(b).digest("hex");
function check(cond: unknown, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`PASS  ${msg}`);
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!, { dbName: process.env.MONGODB_DB ?? "aiseekho" });
  const product = (await Product.findOne({ slug: "ai-se-smart-kaam" }).lean())!;
  const customer = await Customer.findOneAndUpdate({ email: "smoke@example.com" }, { $set: { name: "Smoke Test" } }, { upsert: true, returnDocument: "after" });
  const secret = randomBytes(24).toString("base64url");
  const suffix = randomBytes(5).toString("hex").toUpperCase().replace(/[^A-Z2-9]/g, "X").slice(0, 5).padEnd(5, "X");
  const publicId = `AIS-SMOKE-${suffix}`;
  const rzpOrderId = `order_SMOKE${suffix}`;
  await Order.create({
    publicId, productId: product._id, productSlug: product.slug, productName: product.name, amountPaise: product.pricePaise,
    currency: "INR", mode: "test", customerId: customer._id, customerEmail: "smoke@example.com", customerName: "Smoke Test",
    status: "created", statusHistory: [{ from: null, to: "created", at: new Date(), source: "checkout" }],
    accessHash: sha(secret), razorpayOrderId: rzpOrderId,
  });
  const cookie = `ais_checkout=${encodeURIComponent(`${publicId}~${secret}`)}`;

  let r = await fetch(`${BASE}/order/${publicId}`, { headers: { cookie } });
  check((await r.text()).includes("Payment confirm ho raha hai"), "order page shows PENDING before verification");

  const body = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: `pay_SMOKE${suffix}`, order_id: rzpOrderId, amount: product.pricePaise, currency: "INR", status: "captured", method: "upi" } } } });
  const bad = await fetch(`${BASE}/api/webhooks/razorpay`, { method: "POST", body, headers: { "content-type": "application/json", "x-razorpay-signature": "0".repeat(64), "x-razorpay-event-id": `evt_bad_${suffix}` } });
  check(bad.status === 400, "webhook with invalid signature rejected (400)");

  const sig = createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!).update(body).digest("hex");
  const hdrs = { "content-type": "application/json", "x-razorpay-signature": sig, "x-razorpay-event-id": `evt_smoke_${suffix}` };
  r = await fetch(`${BASE}/api/webhooks/razorpay`, { method: "POST", body, headers: hdrs });
  const wj = await r.json();
  check(r.status === 200 && wj.outcome === "paid", "signed webhook marks order paid");
  r = await fetch(`${BASE}/api/webhooks/razorpay`, { method: "POST", body, headers: hdrs });
  check((await r.json()).duplicate === true, "duplicate webhook delivery is idempotent");

  r = await fetch(`${BASE}/api/orders/${publicId}/status`, { headers: { cookie } });
  check((await r.json()).status === "paid", "status API (cookie-authorised) reports paid");
  r = await fetch(`${BASE}/api/orders/${publicId}/status`);
  check(r.status === 404, "status API without buyer cookie reveals nothing (404)");

  const html = await (await fetch(`${BASE}/order/${publicId}`, { headers: { cookie } })).text();
  check(html.includes("Payment verified"), "order page shows success after server verification");
  const links = [...html.matchAll(/href="(\/api\/download\?[^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, "&"));
  check(links.length === 5, `5 signed download links rendered (got ${links.length})`);

  const zip = await fetch(`${BASE}${links[0]}`);
  const buf = Buffer.from(await zip.arrayBuffer());
  check(zip.status === 200 && sha(buf) === "adc89b4e7202c77333997e294ee8bdc30e30d4eccbd8cd01fc6458e5e9769027", `ZIP streamed intact (${buf.length} bytes, SHA-256 matches approved release)`);
  check(zip.headers.get("content-disposition")?.includes("AI_SE_SMART_KAAM_v4_CUSTOMER_DOWNLOAD.zip"), "Content-Disposition filename correct");

  const tampered = links[0].replace(/s=[a-f0-9]{4}/, "s=0000");
  check((await fetch(`${BASE}${tampered}`)).status === 403, "tampered download link rejected (403)");

  const tokenLink = html.match(/value="(http[^"]+\/download\/[A-Za-z0-9_-]+)"/)?.[1];
  check(tokenLink, "personal download link shown to buyer");
  const dl = await (await fetch(tokenLink!.replace(/^https?:\/\/[^/]+/, BASE))).text();
  check(dl.includes("Reader Edition"), "personal link page lists files (works on another device, no cookie)");
  const badTok = await (await fetch(`${BASE}/download/${"A".repeat(43)}`)).text();
  check(badTok.includes("Download available nahi hai"), "random token shows no files");

  await mongoose.disconnect();
  console.log("\nLocal smoke test passed.");
}
main().catch(async (e) => {
  console.error(e.message);
  await mongoose.disconnect();
  process.exit(1);
});
