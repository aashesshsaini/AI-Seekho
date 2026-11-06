import type { MetadataRoute } from "next";
import { getPublishedTools, getPublishedTutorials } from "@/lib/data/public";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const [tutorials, tools] = await Promise.all([getPublishedTutorials(), getPublishedTools()]);
  const staticPaths = ["", "/products/ai-se-smart-kaam", "/learn", "/tools", "/services", "/about", "/contact"];
  return [
    ...staticPaths.map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const, priority: p === "" || p.startsWith("/products") ? 1 : 0.7 })),
    ...tutorials.map((t) => ({ url: `${base}/learn/${t.slug}`, lastModified: t.updatedAt, changeFrequency: "monthly" as const, priority: 0.6 })),
    ...tools.map((t) => ({ url: `${base}/tools/${t.slug}`, changeFrequency: "monthly" as const, priority: 0.5 })),
  ];
}
