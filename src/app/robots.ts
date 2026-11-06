import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  if (process.env.STAGING_GATE_USER && process.env.STAGING_GATE_PASSWORD) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/order/", "/download/", "/recover"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
