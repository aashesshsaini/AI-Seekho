import "server-only";
import { z } from "zod";
import { connectDb } from "./db";
import { Entitlement, Order, RecoveryRequest, type EntitlementDoc, type OrderDoc } from "./models/commerce";
import { SiteSettings } from "./models/system";
import { downloadPageUrl, revealToken, rotateEntitlementToken } from "./entitlements";
import { getEmailSender, purchaseEmail } from "./email";

export const recoverySchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  orderRef: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^AIS-[A-Z0-9]{5}-[A-Z0-9]{5}$/),
});

/** The response is identical whether or not a purchase exists — no enumeration. */
export const GENERIC_RECOVERY_MESSAGE =
  "Agar yeh details kisi verified purchase se match karti hain, toh download link us email par bheja jayega. Email nahi aaya? Spam folder check kariye ya support se contact kariye.";

export async function getFreshLink(ent: EntitlementDoc): Promise<string> {
  if (ent.tokenExpiresAt.getTime() < Date.now()) return rotateEntitlementToken(ent._id);
  const token = revealToken(ent);
  return token ?? rotateEntitlementToken(ent._id);
}

export async function sendDownloadLinkEmail(order: OrderDoc, token: string, expiresAt: Date) {
  const settings = await SiteSettings.findOne({ key: "site" }, { supportEmail: 1 }).lean();
  const msg = purchaseEmail({
    name: order.customerName,
    productName: order.productName,
    orderRef: order.publicId,
    downloadUrl: downloadPageUrl(token),
    expiresOn: expiresAt.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }),
    supportEmail: settings?.supportEmail ?? "",
  });
  return getEmailSender().send({ to: order.customerEmail, ...msg });
}

export async function requestRecovery(input: unknown): Promise<{ status: 200 | 400; body: { ok?: true; message?: string; error?: string } }> {
  const parsed = recoverySchema.safeParse(input);
  if (!parsed.success) return { status: 400, body: { error: "invalid_request" } };
  const { email, orderRef } = parsed.data;
  await connectDb();

  const order = await Order.findOne({ publicId: orderRef, customerEmail: email, status: "paid" }).lean<OrderDoc>();
  const ent = order ? await Entitlement.findOne({ orderId: order._id, revoked: false }).lean<EntitlementDoc>() : null;

  if (!order || !ent) {
    await RecoveryRequest.create({ email, orderRef, outcome: "no_match" });
    return { status: 200, body: { ok: true, message: GENERIC_RECOVERY_MESSAGE } };
  }

  if (!getEmailSender().configured) {
    // Admin can resolve from the dashboard (Orders → recovery requests).
    await RecoveryRequest.create({ email, orderRef, matchedOrderId: order._id, outcome: "pending_admin" });
    return { status: 200, body: { ok: true, message: GENERIC_RECOVERY_MESSAGE } };
  }

  const token = await getFreshLink(ent);
  const fresh = await Entitlement.findById(ent._id, { tokenExpiresAt: 1 }).lean();
  const result = await sendDownloadLinkEmail(order, token, fresh?.tokenExpiresAt ?? ent.tokenExpiresAt);
  await RecoveryRequest.create({ email, orderRef, matchedOrderId: order._id, outcome: result.status === "sent" ? "emailed" : "pending_admin" });
  return { status: 200, body: { ok: true, message: GENERIC_RECOVERY_MESSAGE } };
}
