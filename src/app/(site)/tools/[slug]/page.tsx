import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getPublishedTools } from "@/lib/data/public";
import { TOOL_CATEGORIES } from "@/lib/models/content";
import { Badge, Card } from "@/components/ui";
import { PRICING_LABEL, VERIFY_LABEL } from "@/lib/labels";

export async function generateStaticParams() {
  const tools = await getPublishedTools();
  // See learn/[slug]: placeholder keeps an unseeded DB from failing the build (renders 404).
  return tools.length ? tools.map((t) => ({ slug: t.slug })) : [{ slug: "__placeholder__" }];
}

async function find(slug: string) {
  return (await getPublishedTools()).find((t) => t.slug === slug) ?? null;
}

export async function generateMetadata({ params }: PageProps<"/tools/[slug]">): Promise<Metadata> {
  const t = await find((await params).slug);
  if (!t) return {};
  return { title: `${t.name} — use cases aur limitations`, description: t.description, alternates: { canonical: `/tools/${t.slug}` } };
}

export default async function ToolPage({ params }: PageProps<"/tools/[slug]">) {
  const t = await find((await params).slug);
  if (!t) notFound();
  const verified = t.lastVerifiedAt ? new Date(t.lastVerifiedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : null;
  return (
    <div className="container-page max-w-4xl py-14 md:py-20">
      <Link href="/tools" className="inline-flex items-center gap-2 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" aria-hidden /> AI Tools directory
      </Link>
      <header className="mt-8 flex flex-col gap-6 border-b border-line pb-10 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">{TOOL_CATEGORIES.find((c) => c.slug === t.category)?.label}</p>
          <h1 className="display-lg mt-3 text-fg">{t.name}</h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-fg-muted">{t.description}</p>
        </div>
        <a href={t.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-400 hover:underline">
          Official website <ExternalLink className="h-4 w-4" aria-hidden />
        </a>
      </header>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-fg-subtle">Best use cases</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-fg marker:text-cyan-400">
            {t.useCases.map((u) => <li key={u}>{u}</li>)}
          </ul>
        </Card>
        <Card>
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-fg-subtle">Pricing</h2>
          <p className="mt-4 font-semibold text-fg">{PRICING_LABEL[t.pricingClass]}</p>
          <p className="mt-2 leading-relaxed text-fg-muted">{t.pricingNote}</p>
        </Card>
        <Card className="md:col-span-2">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-fg-subtle">Limitations aur dhyan dene wali baatein</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-fg-muted marker:text-cyan-400">
            {t.limitations.map((l) => <li key={l}>{l}</li>)}
          </ul>
        </Card>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3 text-sm text-fg-muted">
        <Badge tone={t.verificationStatus === "verified" ? "success" : t.verificationStatus === "partly-verified" ? "warning" : "neutral"}>
          {VERIFY_LABEL[t.verificationStatus]}
        </Badge>
        {verified && <span>Last verified: {verified}</span>}
        {t.sourceUrl && (
          <a href={t.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline">Official source</a>
        )}
      </div>
      <p className="mt-4 text-xs text-fg-subtle">
        Trademarks unke owners ke hain. AI SEEKHO kisi tool se judi, sponsored ya approved nahi hai. Features aur limits badal sakti hain.
      </p>
    </div>
  );
}
