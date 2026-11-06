import { connectDb } from "../db";
import { isDbConfigured } from "../env";
import { Product } from "../models/commerce";
import { seedProduct } from "../content/seed";

export type PublicProduct = {
  slug: string;
  name: string;
  subtitle: string;
  shortDescription: string;
  pricePaise: number;
  active: boolean;
  coverImage: string;
  previewImages: { src: string; alt: string }[];
  highlights: string[];
  seoTitle: string;
  seoDescription: string;
};

/** True when running on Netlify (build or functions). */
export function isOnNetlify(): boolean {
  return process.env.NETLIFY === "true" || Boolean(process.env.NETLIFY_BLOBS_CONTEXT) || Boolean(process.env.SITE_ID && process.env.DEPLOY_ID);
}

/**
 * Seed fallback is ONLY for local design work without a database. On Netlify a
 * missing MONGODB_URI is a configuration error and must not show sample data as
 * if it were the live catalogue.
 */
export function shouldUseSeedFallback(): boolean {
  if (isDbConfigured()) return false;
  if (isOnNetlify()) throw new Error("MONGODB_URI is not configured on Netlify — refusing to serve sample data");
  return true;
}

/**
 * Uncached product read.
 *  - returns the product (active or inactive) when it exists
 *  - returns null ONLY when the database answered and there is no such product
 *  - THROWS on connection/auth/query failure (never disguised as "not found")
 */
export async function loadProduct(slug: string): Promise<PublicProduct | null> {
  if (shouldUseSeedFallback()) return slug === seedProduct.slug ? { ...seedProduct } : null;
  await connectDb();
  const p = await Product.findOne({ slug }).lean();
  if (!p) return null;
  return {
    slug: p.slug,
    name: p.name,
    subtitle: p.subtitle ?? "",
    shortDescription: p.shortDescription ?? "",
    pricePaise: p.pricePaise,
    active: Boolean(p.active),
    coverImage: p.coverImage || seedProduct.coverImage,
    previewImages: (p.previewImages ?? []).map((i) => ({ src: i.src, alt: i.alt })),
    highlights: p.highlights ?? [],
    seoTitle: p.seoTitle ?? "",
    seoDescription: p.seoDescription ?? "",
  };
}
