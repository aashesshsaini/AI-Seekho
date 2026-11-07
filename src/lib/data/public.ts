import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { connectDb, dbRead } from "../db";
import { Service, Tool, Tutorial } from "../models/content";
import { LEGAL_PAGES, SiteSettings, type LegalSlug } from "../models/system";
import { PRODUCT_SLUG, seedLegal, seedServices, seedSettings, seedTools, seedTutorials } from "../content/seed";
import { loadProduct, shouldUseSeedFallback, type PublicProduct } from "./product";

/**
 * Public, cache-friendly reads. When MONGODB_URI is not configured (local
 * design work), bundled seed content is shown instead; production always
 * reads the database. Admin mutations call revalidateTag() on these tags.
 */
export const TAGS = {
  product: "product",
  tutorials: "tutorials",
  tools: "tools",
  services: "services",
  settings: "settings",
} as const;

export type { PublicProduct } from "./product";

/** Cached wrapper. Errors propagate (Next keeps serving the last good page during a failed revalidation). */
export async function getProduct(slug: string = PRODUCT_SLUG): Promise<PublicProduct | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(TAGS.product);
  return loadProduct(slug);
}

export type PublicTutorial = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  level: string;
  readingMinutes: number;
  body: string;
  updatedAt: string;
  sources: { label: string; url: string }[];
};

export async function getPublishedTutorials(): Promise<PublicTutorial[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(TAGS.tutorials);
  if (shouldUseSeedFallback()) {
    return seedTutorials
      .filter((t) => t.status === "published")
      .map((t) => ({ ...t, sources: t.sources ?? [], updatedAt: "2026-11-06T00:00:00.000Z" }));
  }
  const rows = await dbRead(async () => {
    await connectDb();
    return Tutorial.find({ status: "published" }).sort({ publishedAt: -1 }).lean();
  });
  return rows.map((t) => ({
    slug: t.slug,
    title: t.title,
    excerpt: t.excerpt ?? "",
    category: t.category,
    level: t.level ?? "beginner",
    readingMinutes: t.readingMinutes ?? 4,
    body: t.body ?? "",
    updatedAt: (t.updatedAt ?? new Date()).toISOString(),
    sources: (t.sources ?? []).map((s) => ({ label: s.label ?? "", url: s.url ?? "" })),
  }));
}

export type PublicTool = {
  slug: string;
  name: string;
  website: string;
  description: string;
  category: string;
  useCases: string[];
  pricingClass: string;
  pricingNote: string;
  limitations: string[];
  verificationStatus: string;
  lastVerifiedAt: string | null;
  sourceUrl: string;
};

export async function getPublishedTools(): Promise<PublicTool[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(TAGS.tools);
  const rows = shouldUseSeedFallback()
    ? seedTools.filter((t) => t.status === "published")
    : await dbRead(async () => {
        await connectDb();
        return Tool.find({ status: "published" }).sort({ name: 1 }).lean();
      });
  return rows.map((t) => ({
    slug: t.slug,
    name: t.name,
    website: t.website,
    description: t.description ?? "",
    category: t.category,
    useCases: t.useCases ?? [],
    pricingClass: t.pricingClass ?? "unverified",
    pricingNote: t.pricingNote ?? "",
    limitations: t.limitations ?? [],
    verificationStatus: t.verification?.status ?? "unverified",
    lastVerifiedAt: t.verification?.lastVerifiedAt ? new Date(t.verification.lastVerifiedAt).toISOString() : null,
    sourceUrl: t.verification?.sourceUrl ?? "",
  }));
}

export type PublicService = { slug: string; title: string; summary: string; deliverables: string[] };

export async function getServices(): Promise<PublicService[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(TAGS.services);
  if (shouldUseSeedFallback()) return seedServices.map(({ slug, title, summary, deliverables }) => ({ slug, title, summary, deliverables }));
  const rows = await dbRead(async () => {
    await connectDb();
    return Service.find({ status: "published" }).sort({ sortOrder: 1 }).lean();
  });
  return rows.map((s) => ({ slug: s.slug, title: s.title, summary: s.summary ?? "", deliverables: s.deliverables ?? [] }));
}

export type PublicSettings = {
  brandName: string;
  tagline: string;
  supportEmail: string;
  supportHours: string;
  seoTitle: string;
  seoDescription: string;
  socialLinks: { label: string; url: string }[];
  business: { legalName: string; address: string; gstin: string };
};

export async function getSettings(): Promise<PublicSettings> {
  "use cache";
  cacheLife("minutes");
  cacheTag(TAGS.settings);
  if (shouldUseSeedFallback()) return { ...seedSettings };
  const s = await dbRead(async () => {
    await connectDb();
    return SiteSettings.findOne({ key: "site" }).lean();
  });
  if (!s) return { ...seedSettings };
  return {
    brandName: s.brandName ?? seedSettings.brandName,
    tagline: s.tagline ?? seedSettings.tagline,
    supportEmail: s.supportEmail ?? "",
    supportHours: s.supportHours ?? "",
    seoTitle: s.seoTitle || seedSettings.seoTitle,
    seoDescription: s.seoDescription || seedSettings.seoDescription,
    socialLinks: (s.socialLinks ?? []).map((l) => ({ label: l.label ?? "", url: l.url ?? "" })),
    business: {
      legalName: s.business?.legalName ?? "",
      address: s.business?.address ?? "",
      gstin: s.business?.gstin ?? "",
    },
  };
}

export async function getLegalPage(slug: LegalSlug): Promise<{ title: string; body: string; approved: boolean; updatedAt: string | null }> {
  "use cache";
  cacheLife("minutes");
  cacheTag(TAGS.settings);
  const meta = LEGAL_PAGES.find((p) => p.slug === slug)!;
  if (!shouldUseSeedFallback()) {
    const s = await dbRead(async () => {
      await connectDb();
      return SiteSettings.findOne({ key: "site" }, { legalPages: 1 }).lean();
    });
    const page = s?.legalPages?.find((p) => p.slug === slug);
    if (page?.body) {
      return { title: meta.title, body: page.body, approved: Boolean(page.approved), updatedAt: page.updatedAt ? new Date(page.updatedAt).toISOString() : null };
    }
  }
  return { title: meta.title, body: seedLegal[slug] ?? "", approved: false, updatedAt: null };
}
