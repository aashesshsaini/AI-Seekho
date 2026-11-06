"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import clsx from "clsx";
import { Search } from "lucide-react";
import { Badge, inputClass } from "@/components/ui";
import { PRICING_LABEL, VERIFY_LABEL } from "@/lib/labels";

type Tool = { slug: string; name: string; description: string; category: string; pricingClass: string; verificationStatus: string; lastVerifiedAt: string | null };
type C = { slug: string; label: string };

export function ToolBrowser({ tools, categories }: { tools: Tool[]; categories: readonly C[] }) {
  const [cat, setCat] = useState("all");
  const [pricing, setPricing] = useState("all");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return tools.filter(
      (t) =>
        (cat === "all" || t.category === cat) &&
        (pricing === "all" || t.pricingClass === pricing) &&
        (!n || `${t.name} ${t.description}`.toLowerCase().includes(n)),
    );
  }, [tools, cat, pricing, q]);

  return (
    <div>
      <div className="grid gap-4 md:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <label htmlFor="tool-search" className="sr-only">Tools search kariye</label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
          <input id="tool-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tools…" className={clsx(inputClass, "pl-9")} />
        </div>
        <div>
          <label htmlFor="tool-cat" className="sr-only">Category</label>
          <select id="tool-cat" value={cat} onChange={(e) => setCat(e.target.value)} className={inputClass}>
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="tool-pricing" className="sr-only">Pricing</label>
          <select id="tool-pricing" value={pricing} onChange={(e) => setPricing(e.target.value)} className={inputClass}>
            <option value="all">Any pricing</option>
            {Object.entries(PRICING_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>
      <p className="mt-4 text-sm text-fg-subtle" aria-live="polite">{filtered.length} tools</p>
      <ul className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((t) => (
          <li key={t.slug}>
            <Link href={`/tools/${t.slug}`} className="surface group flex h-full flex-col p-6 transition-colors hover:border-line-strong">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold text-fg group-hover:text-cyan-300">{t.name}</h2>
                <Badge tone={t.verificationStatus === "verified" ? "success" : t.verificationStatus === "partly-verified" ? "warning" : "neutral"}>
                  {VERIFY_LABEL[t.verificationStatus] ?? t.verificationStatus}
                </Badge>
              </div>
              <p className="mt-2 flex-1 leading-relaxed text-fg-muted">{t.description}</p>
              <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-fg-subtle">
                <span>{categories.find((c) => c.slug === t.category)?.label}</span>
                <span aria-hidden>·</span>
                <span>{PRICING_LABEL[t.pricingClass]}</span>
                {t.lastVerifiedAt && (
                  <>
                    <span aria-hidden>·</span>
                    <span>Checked {new Date(t.lastVerifiedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                  </>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
