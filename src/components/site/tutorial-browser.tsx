"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import clsx from "clsx";
import { Search } from "lucide-react";
import { Badge, inputClass } from "@/components/ui";

type T = { slug: string; title: string; excerpt: string; category: string; readingMinutes: number; level: string };
type C = { slug: string; label: string };

export function TutorialBrowser({ tutorials, categories }: { tutorials: T[]; categories: readonly C[] }) {
  const params = useSearchParams();
  const initial = params.get("category");
  const [category, setCategory] = useState<string>(categories.some((c) => c.slug === initial) ? initial! : "all");
  const [q, setQ] = useState("");

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const t of tutorials) m[t.category] = (m[t.category] ?? 0) + 1;
    return m;
  }, [tutorials]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return tutorials.filter(
      (t) => (category === "all" || t.category === category) && (!needle || `${t.title} ${t.excerpt}`.toLowerCase().includes(needle)),
    );
  }, [tutorials, category, q]);

  const label = (slug: string) => categories.find((c) => c.slug === slug)?.label ?? slug;

  return (
    <div>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div role="group" aria-label="Category filter" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {[{ slug: "all", label: "Sab" }, ...categories].map((c) => (
            <button
              key={c.slug}
              type="button"
              aria-pressed={category === c.slug}
              onClick={() => setCategory(c.slug)}
              className={clsx(
                "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                category === c.slug ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-300" : "border-line-strong text-fg-muted hover:text-fg",
              )}
            >
              {c.label}
              {c.slug !== "all" && <span className="ml-1.5 text-fg-subtle">{counts[c.slug] ?? 0}</span>}
            </button>
          ))}
        </div>
        <div className="relative lg:w-72">
          <label htmlFor="tut-search" className="sr-only">Tutorials search kariye</label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
          <input id="tut-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tutorials…" className={clsx(inputClass, "pl-9")} />
        </div>
      </div>

      <p className="sr-only" aria-live="polite">{filtered.length} tutorials</p>

      {filtered.length === 0 ? (
        <div className="surface mt-10 p-10 text-center">
          <p className="font-semibold text-fg">{category !== "all" && !counts[category] ? `${label(category)} ke tutorials jaldi aa rahe hain.` : "Koi tutorial match nahi hua."}</p>
          <p className="mt-2 text-sm text-fg-muted">Tab tak, baaki categories dekhiye ya search badaliye.</p>
        </div>
      ) : (
        <ul className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => (
            <li key={t.slug}>
              <Link href={`/learn/${t.slug}`} className="surface group flex h-full flex-col p-6 transition-colors hover:border-line-strong md:p-7">
                <Badge tone="cyan" className="self-start">{label(t.category)}</Badge>
                <h2 className="mt-5 text-lg font-semibold leading-snug text-fg group-hover:text-cyan-300">{t.title}</h2>
                <p className="mt-3 flex-1 leading-relaxed text-fg-muted">{t.excerpt}</p>
                <p className="mt-6 text-sm text-fg-subtle">
                  {t.readingMinutes} min read · {t.level === "beginner" ? "Beginner" : "Intermediate"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
