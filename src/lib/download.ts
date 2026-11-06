import "server-only";
import { connectDb } from "./db";
import { env } from "./env";
import { hashIp } from "./crypto";
import { checkEntitlement, verifyFileLink } from "./entitlements";
import { DownloadAudit, Entitlement, ProductAsset, type EntitlementDoc } from "./models/commerce";
import { getStorage } from "./storage";

const DENY_HEADERS = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };

function deny(status: number, message: string): Response {
  return new Response(message, { status, headers: { ...DENY_HEADERS, "Content-Type": "text/plain; charset=utf-8" } });
}

/**
 * Serves a paid file. Authorization = valid HMAC-signed, unexpired link that
 * was issued to a verified entitlement holder. Order IDs alone never authorize.
 */
export async function serveDownload(url: URL, ip: string): Promise<Response> {
  const link = verifyFileLink(url.searchParams);
  await connectDb();
  const ipHash = hashIp(ip, env.appSecret);
  if (!link.ok) {
    await DownloadAudit.create({ outcome: link.reason, ipHash });
    return link.reason === "denied_expired"
      ? deny(410, "Yeh download link expire ho gaya hai. Download page refresh karke naya link lijiye.")
      : deny(403, "Invalid download link.");
  }

  const ent = await Entitlement.findById(link.entitlementId).lean<EntitlementDoc>();
  const check = await checkEntitlement(ent);
  if (!check.ok) {
    await DownloadAudit.create({ entitlementId: ent?._id, outcome: check.reason === "revoked" ? "denied_revoked" : check.reason === "expired" ? "denied_expired" : "denied_missing", ipHash });
    return deny(403, "Is purchase ke liye download available nahi hai. Support se contact kariye.");
  }

  const asset = await ProductAsset.findOne({ _id: link.assetId, productId: check.entitlement.productId, active: true }).lean();
  if (!asset) {
    await DownloadAudit.create({ entitlementId: ent!._id, outcome: "denied_missing", ipHash });
    return deny(404, "File nahi mili.");
  }

  // Atomic counter: allows reasonable retries but caps abuse of a leaked link.
  const counted = await Entitlement.findOneAndUpdate(
    { _id: ent!._id, revoked: false, $expr: { $lt: ["$downloadCount", "$maxDownloads"] } },
    { $inc: { downloadCount: 1 }, $set: { lastDownloadAt: new Date() } },
    { returnDocument: "after" },
  ).lean();
  if (!counted) {
    await DownloadAudit.create({ entitlementId: ent!._id, assetId: asset._id, outcome: "denied_limit", ipHash });
    return deny(429, "Download limit poori ho gayi hai. Kripya support se contact kariye.");
  }

  let file;
  try {
    file = await getStorage().open(asset.storageKey);
  } catch {
    file = null;
  }
  if (!file) {
    // Give the attempt back — the failure is ours, not the buyer's.
    await Entitlement.updateOne({ _id: ent!._id }, { $inc: { downloadCount: -1 } });
    await DownloadAudit.create({ entitlementId: ent!._id, assetId: asset._id, outcome: "error", ipHash });
    console.error("[download] storage object missing for asset", String(asset._id));
    return deny(503, "File abhi available nahi hai. Thodi der baad try kariye ya support se contact kariye.");
  }

  await DownloadAudit.create({ entitlementId: ent!._id, assetId: asset._id, outcome: "served", ipHash });
  const headers: Record<string, string> = {
    "Content-Type": asset.contentType,
    "Content-Disposition": `attachment; filename="${asset.filename}"`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex",
    "Referrer-Policy": "no-referrer",
  };
  if (file.size) headers["Content-Length"] = String(file.size);
  return new Response(file.body, { status: 200, headers });
}
