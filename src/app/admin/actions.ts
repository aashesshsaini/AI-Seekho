"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { z } from "zod";
import { authenticate, destroyCurrentSession, requireAdmin, setSessionCookie } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { connectDb } from "@/lib/db";
import { env } from "@/lib/env";
import { hashIp } from "@/lib/crypto";
import { rateLimit } from "@/lib/ratelimit";
import { rupeesStringToPaise } from "@/lib/money";
import { TAGS } from "@/lib/data/public";
import { Entitlement, Order, Product, RecoveryRequest, type OrderDoc } from "@/lib/models/commerce";
import { Enquiry, PRICING_CLASSES, Service, TOOL_CATEGORIES, TUTORIAL_CATEGORIES, Tool, Tutorial, type ToolCategory, type TutorialCategory } from "@/lib/models/content";
import { LEGAL_PAGES, SiteSettings } from "@/lib/models/system";
import { rotateEntitlementToken } from "@/lib/entitlements";
import { sendDownloadLinkEmail } from "@/lib/recovery";
import { isObjectId } from "@/lib/payments/service";

/* ---------------------------------------------------------------- helpers */

const lines = (v: FormDataEntryValue | null) =>
  String(v ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const bool = (fd: FormData, k: string) => fd.get(k) === "on";
const objectId = z.string().refine(isObjectId, "Invalid id");
const slugSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug: lowercase letters, numbers, hyphens").max(80);

function back(path: string, params: Record<string, string>): never {
  redirect(`${path}?${new URLSearchParams(params).toString()}`);
}

/* ------------------------------------------------------------------- auth */

export async function loginAction(_prev: { error: string; email?: string }, fd: FormData): Promise<{ error: string; email?: string }> {
  const h = await headers();
  const ip = h.get("x-nf-client-connection-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limit = await rateLimit("admin-login", hashIp(ip, env.appSecret), 10, 900);
  const email = str(fd, "email").slice(0, 254);
  if (!limit.ok) return { error: "Bahut zyada attempts. 15 minute baad try kariye.", email };
  const password = String(fd.get("password") ?? "");
  if (!email || !password || password.length > 200) return { error: "Email ya password galat hai.", email };
  const result = await authenticate(email, password);
  if (!result.ok) {
    await audit(null, "admin.login_failed", email.toLowerCase().slice(0, 254), { locked: result.reason === "locked" });
    return { error: result.reason === "locked" ? "Account temporarily locked. Thodi der baad try kariye." : "Email ya password galat hai.", email };
  }
  await setSessionCookie(result.token, result.expiresAt);
  await audit(null, "admin.login", email.toLowerCase());
  redirect("/admin");
}

export async function logoutAction() {
  await destroyCurrentSession();
  redirect("/admin/login");
}

/* -------------------------------------------------------------- products */

const productSchema = z.object({
  id: objectId,
  name: z.string().min(2).max(140),
  subtitle: z.string().max(240),
  shortDescription: z.string().max(600),
  price: z.string().regex(/^\d{1,7}(\.\d{1,2})?$/, "Price: rupees, e.g. 199 or 199.00"),
  seoTitle: z.string().max(80),
  seoDescription: z.string().max(200),
});

export async function updateProductAction(fd: FormData) {
  const admin = await requireAdmin("owner");
  const parsed = productSchema.safeParse({
    id: str(fd, "id"),
    name: str(fd, "name"),
    subtitle: str(fd, "subtitle"),
    shortDescription: str(fd, "shortDescription"),
    price: str(fd, "price"),
    seoTitle: str(fd, "seoTitle"),
    seoDescription: str(fd, "seoDescription"),
  });
  const id = str(fd, "id");
  if (!parsed.success) back(`/admin/products/${id}`, { error: parsed.error.issues[0]?.message ?? "Invalid input" });
  const pricePaise = rupeesStringToPaise(parsed.data.price);
  if (pricePaise < 100) back(`/admin/products/${id}`, { error: "Price kam se kam ₹1 hona chahiye" });

  // Preview images must be public preview files only — never paid assets.
  const previews = lines(fd.get("previewImages")).map((l) => {
    const [src, ...alt] = l.split("|");
    return { src: src.trim(), alt: alt.join("|").trim() };
  });
  if (previews.some((p) => !/^\/images\/[A-Za-z0-9/_.-]+\.(webp|png|jpe?g|avif)$/.test(p.src) || !p.alt)) {
    back(`/admin/products/${id}`, { error: "Preview images: har line '/images/... | alt text' format mein" });
  }

  await connectDb();
  const before = await Product.findById(parsed.data.id, { pricePaise: 1, active: 1 }).lean();
  if (!before) back("/admin/products", { error: "Product not found" });
  await Product.updateOne(
    { _id: parsed.data.id },
    {
      $set: {
        name: parsed.data.name,
        subtitle: parsed.data.subtitle,
        shortDescription: parsed.data.shortDescription,
        pricePaise,
        active: bool(fd, "active"),
        seoTitle: parsed.data.seoTitle,
        seoDescription: parsed.data.seoDescription,
        highlights: lines(fd.get("highlights")),
        previewImages: previews,
      },
    },
    { runValidators: true },
  );
  await audit(admin, "product.update", parsed.data.id, {
    priceFrom: before.pricePaise,
    priceTo: pricePaise,
    activeFrom: before.active,
    activeTo: bool(fd, "active"),
  });
  updateTag(TAGS.product);
  back(`/admin/products/${id}`, { saved: "1" });
}

/* ------------------------------------------------------------- tutorials */

const tutorialSchema = z.object({
  slug: slugSchema,
  title: z.string().min(3).max(160),
  excerpt: z.string().max(300),
  category: z.enum(TUTORIAL_CATEGORIES.map((c) => c.slug) as [TutorialCategory, ...TutorialCategory[]]),
  level: z.enum(["beginner", "intermediate"]),
  readingMinutes: z.coerce.number().int().min(1).max(60),
  status: z.enum(["draft", "published"]),
  body: z.string().max(60_000),
});

export async function saveTutorialAction(fd: FormData) {
  const admin = await requireAdmin("editor");
  const id = str(fd, "id");
  const parsed = tutorialSchema.safeParse({
    slug: str(fd, "slug"),
    title: str(fd, "title"),
    excerpt: str(fd, "excerpt"),
    category: str(fd, "category"),
    level: str(fd, "level") || "beginner",
    readingMinutes: str(fd, "readingMinutes") || "4",
    status: str(fd, "status"),
    body: String(fd.get("body") ?? ""),
  });
  const path = `/admin/content/tutorials/${id || "new"}`;
  if (!parsed.success) back(path, { error: parsed.error.issues[0]?.message ?? "Invalid input" });
  const sources = lines(fd.get("sources"))
    .map((l) => {
      const [label, url] = l.split("|").map((s) => s.trim());
      return { label, url };
    })
    .filter((s) => /^https:\/\//.test(s.url ?? ""));
  await connectDb();
  let savedId = id;
  try {
    if (id && isObjectId(id)) {
      const existing = await Tutorial.findById(id, { publishedAt: 1 }).lean();
      await Tutorial.updateOne(
        { _id: id },
        { $set: { ...parsed.data, sources, ...(parsed.data.status === "published" && !existing?.publishedAt ? { publishedAt: new Date() } : {}) } },
        { runValidators: true },
      );
    } else {
      const doc = await Tutorial.create({ ...parsed.data, sources, ...(parsed.data.status === "published" ? { publishedAt: new Date() } : {}) });
      savedId = String(doc._id);
    }
  } catch (err) {
    if ((err as { code?: number }).code === 11000) back(path, { error: "Yeh slug pehle se use ho raha hai" });
    throw err;
  }
  await audit(admin, id ? "tutorial.update" : "tutorial.create", savedId, { slug: parsed.data.slug, status: parsed.data.status });
  updateTag(TAGS.tutorials);
  back(`/admin/content/tutorials/${savedId}`, { saved: "1" });
}

/* ------------------------------------------------------------------ tools */

const toolSchema = z.object({
  slug: slugSchema,
  name: z.string().min(1).max(80),
  website: z.string().url().startsWith("https://"),
  description: z.string().max(500),
  category: z.enum(TOOL_CATEGORIES.map((c) => c.slug) as [ToolCategory, ...ToolCategory[]]),
  pricingClass: z.enum(PRICING_CLASSES),
  pricingNote: z.string().max(400),
  verificationStatus: z.enum(["verified", "partly-verified", "unverified"]),
  lastVerifiedAt: z.string().regex(/^$|^\d{4}-\d{2}-\d{2}$/),
  sourceUrl: z.string().regex(/^$|^https:\/\//),
  status: z.enum(["draft", "published"]),
});

export async function saveToolAction(fd: FormData) {
  const admin = await requireAdmin("editor");
  const id = str(fd, "id");
  const path = `/admin/content/tools/${id || "new"}`;
  const parsed = toolSchema.safeParse(Object.fromEntries(["slug", "name", "website", "description", "category", "pricingClass", "pricingNote", "verificationStatus", "lastVerifiedAt", "sourceUrl", "status"].map((k) => [k, str(fd, k)])));
  if (!parsed.success) back(path, { error: `${parsed.error.issues[0]?.path.join(".")}: ${parsed.error.issues[0]?.message}` });
  const d = parsed.data;
  // A tool cannot be marked "free" without a verification date and source.
  if ((d.pricingClass === "free" || d.pricingClass === "free-plan-with-limits") && (!d.lastVerifiedAt || !d.sourceUrl)) {
    back(path, { error: "Free / free-plan claim ke liye verification date aur official source URL zaroori hai" });
  }
  const doc = {
    slug: d.slug,
    name: d.name,
    website: d.website,
    description: d.description,
    category: d.category,
    pricingClass: d.pricingClass,
    pricingNote: d.pricingNote,
    useCases: lines(fd.get("useCases")),
    limitations: lines(fd.get("limitations")),
    verification: { status: d.verificationStatus, lastVerifiedAt: d.lastVerifiedAt ? new Date(`${d.lastVerifiedAt}T00:00:00+05:30`) : undefined, sourceUrl: d.sourceUrl },
    status: d.status,
  };
  await connectDb();
  let savedId = id;
  try {
    if (id && isObjectId(id)) await Tool.updateOne({ _id: id }, { $set: doc }, { runValidators: true });
    else savedId = String((await Tool.create(doc))._id);
  } catch (err) {
    if ((err as { code?: number }).code === 11000) back(path, { error: "Yeh slug pehle se use ho raha hai" });
    throw err;
  }
  await audit(admin, id ? "tool.update" : "tool.create", savedId, { slug: d.slug, status: d.status });
  updateTag(TAGS.tools);
  back(`/admin/content/tools/${savedId}`, { saved: "1" });
}

/* --------------------------------------------------------------- services */

export async function saveServiceAction(fd: FormData) {
  const admin = await requireAdmin("editor");
  const id = str(fd, "id");
  const path = `/admin/content/services/${id || "new"}`;
  const parsed = z
    .object({ slug: slugSchema, title: z.string().min(2).max(100), summary: z.string().max(400), sortOrder: z.coerce.number().int().min(0).max(999), status: z.enum(["draft", "published"]) })
    .safeParse({ slug: str(fd, "slug"), title: str(fd, "title"), summary: str(fd, "summary"), sortOrder: str(fd, "sortOrder") || "0", status: str(fd, "status") });
  if (!parsed.success) back(path, { error: parsed.error.issues[0]?.message ?? "Invalid input" });
  const doc = { ...parsed.data, deliverables: lines(fd.get("deliverables")) };
  await connectDb();
  let savedId = id;
  try {
    if (id && isObjectId(id)) await Service.updateOne({ _id: id }, { $set: doc }, { runValidators: true });
    else savedId = String((await Service.create(doc))._id);
  } catch (err) {
    if ((err as { code?: number }).code === 11000) back(path, { error: "Yeh slug pehle se use ho raha hai" });
    throw err;
  }
  await audit(admin, id ? "service.update" : "service.create", savedId, { slug: doc.slug });
  updateTag(TAGS.services);
  back(`/admin/content/services/${savedId}`, { saved: "1" });
}

/* -------------------------------------------------------------- enquiries */

export async function updateEnquiryStatusAction(fd: FormData) {
  const admin = await requireAdmin("editor");
  const id = str(fd, "id");
  const status = z.enum(["new", "in_progress", "closed", "spam"]).safeParse(str(fd, "status"));
  if (!isObjectId(id) || !status.success) back("/admin/enquiries", { error: "Invalid request" });
  await connectDb();
  await Enquiry.updateOne({ _id: id }, { $set: { status: status.data } });
  await audit(admin, "enquiry.status", id, { status: status.data });
  back("/admin/enquiries", { saved: "1" });
}

/* --------------------------------------------------------------- settings */

export async function saveSettingsAction(fd: FormData) {
  const admin = await requireAdmin("owner");
  const supportEmail = str(fd, "supportEmail");
  if (supportEmail && !z.string().email().safeParse(supportEmail).success) back("/admin/settings", { error: "Support email invalid" });
  const social = lines(fd.get("socialLinks"))
    .map((l) => {
      const [label, url] = l.split("|").map((s) => s.trim());
      return { label, url };
    })
    .filter((s) => s.label && /^https:\/\//.test(s.url ?? ""));
  const legalPages = LEGAL_PAGES.map((p) => ({
    slug: p.slug,
    body: String(fd.get(`legal_${p.slug}`) ?? "").slice(0, 60_000),
    approved: bool(fd, `approved_${p.slug}`),
    updatedAt: new Date(),
  }));
  await connectDb();
  await SiteSettings.updateOne(
    { key: "site" },
    {
      $set: {
        brandName: str(fd, "brandName").slice(0, 60) || "AI SEEKHO",
        tagline: str(fd, "tagline").slice(0, 120),
        supportEmail,
        supportHours: str(fd, "supportHours").slice(0, 120),
        seoTitle: str(fd, "seoTitle").slice(0, 80),
        seoDescription: str(fd, "seoDescription").slice(0, 200),
        socialLinks: social,
        "business.legalName": str(fd, "legalName").slice(0, 160),
        "business.address": str(fd, "address").slice(0, 400),
        "business.gstin": str(fd, "gstin").slice(0, 20),
        legalPages,
      },
    },
    { upsert: true },
  );
  await audit(admin, "settings.update", "site", { approvedLegal: legalPages.filter((p) => p.approved).map((p) => p.slug) });
  updateTag(TAGS.settings);
  back("/admin/settings", { saved: "1" });
}

/* ------------------------------------------------------- order recovery */

async function loadPaidOrder(id: string): Promise<OrderDoc> {
  if (!isObjectId(id)) back("/admin/orders", { error: "Invalid order" });
  await connectDb();
  const order = await Order.findById(id).lean<OrderDoc>();
  if (!order || order.status !== "paid") back(`/admin/orders/${id}`, { error: "Sirf paid orders ke liye" });
  return order;
}

/** Issues a new download link (old link stops working). Owner only. */
export async function regenerateLinkAction(fd: FormData) {
  const admin = await requireAdmin("owner");
  const id = str(fd, "id");
  const order = await loadPaidOrder(id);
  const ent = await Entitlement.findOne({ orderId: order._id, revoked: false }).lean();
  if (!ent) back(`/admin/orders/${id}`, { error: "Entitlement nahi mila" });
  const token = await rotateEntitlementToken(ent._id);
  let emailed = "not_configured";
  if (bool(fd, "sendEmail")) {
    const fresh = await Entitlement.findById(ent._id, { tokenExpiresAt: 1 }).lean();
    const r = await sendDownloadLinkEmail(order, token, fresh!.tokenExpiresAt);
    emailed = r.status;
  }
  await RecoveryRequest.updateMany({ matchedOrderId: order._id, outcome: "pending_admin" }, { $set: { outcome: "resolved" } });
  await audit(admin, "order.link_regenerated", id, { emailed });
  back(`/admin/orders/${id}`, { saved: "1", reveal: "1", emailed });
}

export async function resendEmailAction(fd: FormData) {
  const admin = await requireAdmin("owner");
  const id = str(fd, "id");
  const order = await loadPaidOrder(id);
  const ent = await Entitlement.findOne({ orderId: order._id, revoked: false }).lean();
  if (!ent) back(`/admin/orders/${id}`, { error: "Entitlement nahi mila" });
  const { getFreshLink } = await import("@/lib/recovery");
  const token = await getFreshLink(ent);
  const fresh = await Entitlement.findById(ent._id, { tokenExpiresAt: 1 }).lean();
  const r = await sendDownloadLinkEmail(order, token, fresh!.tokenExpiresAt);
  await audit(admin, "order.email_resent", id, { result: r.status });
  back(`/admin/orders/${id}`, r.status === "sent" ? { saved: "1" } : { error: r.status === "not_configured" ? "Email provider configure nahi hai" : "Email send failed" });
}

export async function resolveRecoveryAction(fd: FormData) {
  const admin = await requireAdmin("owner");
  const id = str(fd, "id");
  if (!isObjectId(id)) back("/admin/orders", { error: "Invalid request" });
  await connectDb();
  await RecoveryRequest.updateOne({ _id: id }, { $set: { outcome: "resolved" } });
  await audit(admin, "recovery.resolved", id);
  back("/admin/orders", { saved: "1" });
}
