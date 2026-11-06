import "server-only";
import type { Types } from "mongoose";
import { connectDb } from "./db";
import { env } from "./env";
import { decryptString, encryptString, hmacSha256Hex, randomToken, safeEqual, sha256Hex } from "./crypto";
import { Entitlement, Order, ProductAsset, type EntitlementDoc } from "./models/commerce";

export const ENTITLEMENT_TTL_DAYS = 180;
export const FILE_LINK_TTL_SECONDS = 10 * 60;
const TOKEN_PURPOSE = "entitlement-token";

function newTokenFields() {
  const token = randomToken(32);
  const now = new Date();
  return {
    token,
    fields: {
      tokenHash: sha256Hex(token),
      tokenCiphertext: encryptString(token, env.appSecret, TOKEN_PURPOSE),
      tokenIssuedAt: now,
      tokenExpiresAt: new Date(now.getTime() + ENTITLEMENT_TTL_DAYS * 86400_000),
    },
  };
}

/**
 * Idempotently creates the single entitlement for a paid order. The unique
 * index on orderId guarantees duplicates cannot be created under retries or
 * concurrent webhook + verify processing.
 */
export async function ensureEntitlement(order: {
  _id: Types.ObjectId;
  customerId: Types.ObjectId;
  productId: Types.ObjectId;
}): Promise<{ entitlement: EntitlementDoc; created: boolean }> {
  await connectDb();
  const existing = await Entitlement.findOne({ orderId: order._id }).lean<EntitlementDoc>();
  if (existing) return { entitlement: existing, created: false };
  const { fields } = newTokenFields();
  try {
    const doc = await Entitlement.create({
      orderId: order._id,
      customerId: order.customerId,
      productId: order.productId,
      ...fields,
    });
    await Order.updateOne({ _id: order._id }, { $set: { "delivery.entitlementId": doc._id } });
    return { entitlement: doc.toObject() as EntitlementDoc, created: true };
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      const doc = await Entitlement.findOne({ orderId: order._id }).lean<EntitlementDoc>();
      if (doc) return { entitlement: doc, created: false };
    }
    throw err;
  }
}

export function revealToken(ent: Pick<EntitlementDoc, "tokenCiphertext">): string | null {
  return decryptString(ent.tokenCiphertext, env.appSecret, TOKEN_PURPOSE);
}

export function downloadPageUrl(token: string): string {
  return `${env.siteUrl}/download/${token}`;
}

/** Replace the bearer token (old link stops working) and extend validity. */
export async function rotateEntitlementToken(entitlementId: Types.ObjectId | string): Promise<string> {
  await connectDb();
  const { token, fields } = newTokenFields();
  const res = await Entitlement.updateOne({ _id: entitlementId, revoked: false }, { $set: fields });
  if (res.matchedCount !== 1) throw new Error("Entitlement not found or revoked");
  return token;
}

export type EntitlementCheck =
  | { ok: true; entitlement: EntitlementDoc }
  | { ok: false; reason: "not_found" | "expired" | "revoked" | "order_not_paid" };

export async function findEntitlementByToken(token: string): Promise<EntitlementCheck> {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return { ok: false, reason: "not_found" };
  await connectDb();
  const ent = await Entitlement.findOne({ tokenHash: sha256Hex(token) }).lean<EntitlementDoc>();
  return checkEntitlement(ent);
}

export async function checkEntitlement(ent: EntitlementDoc | null): Promise<EntitlementCheck> {
  if (!ent) return { ok: false, reason: "not_found" };
  if (ent.revoked) return { ok: false, reason: "revoked" };
  if (ent.tokenExpiresAt.getTime() < Date.now()) return { ok: false, reason: "expired" };
  const order = await Order.findById(ent.orderId, { status: 1 }).lean();
  if (!order || order.status !== "paid") return { ok: false, reason: "order_not_paid" };
  return { ok: true, entitlement: ent };
}

/* ------------------------------------------------- short-lived file links */

function fileSig(entitlementId: string, assetId: string, exp: number): string {
  return hmacSha256Hex(env.appSecret, `dl:${entitlementId}:${assetId}:${exp}`);
}

export function signFileLink(entitlementId: string, assetId: string, now = Date.now()): string {
  const exp = Math.floor(now / 1000) + FILE_LINK_TTL_SECONDS;
  const q = new URLSearchParams({ e: entitlementId, a: assetId, x: String(exp), s: fileSig(entitlementId, assetId, exp) });
  return `/api/download?${q.toString()}`;
}

export type FileLinkCheck =
  | { ok: true; entitlementId: string; assetId: string }
  | { ok: false; reason: "denied_signature" | "denied_expired" };

export function verifyFileLink(params: URLSearchParams, now = Date.now()): FileLinkCheck {
  const e = params.get("e") ?? "";
  const a = params.get("a") ?? "";
  const x = Number(params.get("x"));
  const s = params.get("s") ?? "";
  if (!/^[a-f0-9]{24}$/.test(e) || !/^[a-f0-9]{24}$/.test(a) || !Number.isSafeInteger(x)) {
    return { ok: false, reason: "denied_signature" };
  }
  if (!safeEqual(fileSig(e, a, x), s)) return { ok: false, reason: "denied_signature" };
  if (x * 1000 < now) return { ok: false, reason: "denied_expired" };
  return { ok: true, entitlementId: e, assetId: a };
}

export async function listDownloadableFiles(ent: EntitlementDoc) {
  await connectDb();
  const assets = await ProductAsset.find({ productId: ent.productId, active: true }).sort({ sortOrder: 1 }).lean();
  return assets.map((a) => ({
    id: String(a._id),
    label: a.label,
    filename: a.filename,
    sizeBytes: a.sizeBytes,
    contentType: a.contentType,
    href: signFileLink(String(ent._id), String(a._id)),
  }));
}
