import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getPublishedTutorials } from "@/lib/data/public";
import { TUTORIAL_CATEGORIES } from "@/lib/models/content";
import { Markdown } from "@/lib/markdown";
import { Badge, ButtonLink } from "@/components/ui";

export async function generateStaticParams() {
  const tutorials = await getPublishedTutorials();
  return tutorials.map((t) => ({ slug: t.slug }));
}

async function find(slug: string) {
  const all = await getPublishedTutorials();
  return all.find((t) => t.slug === slug) ?? null;
}

export async function generateMetadata({ params }: PageProps<"/learn/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const t = await find(slug);
  if (!t) return {};
  return {
    title: t.title,
    description: t.excerpt,
    alternates: { canonical: `/learn/${t.slug}` },
    openGraph: { type: "article", title: t.title, description: t.excerpt, url: `/learn/${t.slug}` },
  };
}

export default async function TutorialPage({ params }: PageProps<"/learn/[slug]">) {
  const { slug } = await params;
  const t = await find(slug);
  if (!t) notFound();
  const cat = TUTORIAL_CATEGORIES.find((c) => c.slug === t.category)?.label ?? t.category;
  return (
    <article className="container-page max-w-3xl py-14 md:py-20">
      <Link href="/learn" className="inline-flex items-center gap-2 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Saare tutorials
      </Link>
      <header className="mt-8 border-b border-line pb-10">
        <Badge tone="cyan">{cat}</Badge>
        <h1 className="display-lg mt-5 text-fg">{t.title}</h1>
        <p className="mt-5 text-lg leading-relaxed text-fg-muted">{t.excerpt}</p>
        <p className="mt-6 text-sm text-fg-subtle">
          {t.readingMinutes} min read · Updated{" "}
          <time dateTime={t.updatedAt}>{new Date(t.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</time>
        </p>
      </header>
      <div className="mt-10">
        <Markdown source={t.body} />
      </div>
      {t.sources.length > 0 && (
        <aside className="mt-12 border-t border-line pt-8">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-fg-subtle">Sources</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {t.sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline">{s.label || s.url}</a>
              </li>
            ))}
          </ul>
        </aside>
      )}
      <div className="surface mt-14 p-7">
        <p className="font-semibold text-fg">Aage seekhna hai?</p>
        <p className="mt-1 text-fg-muted">AI SE SMART KAAM mein 25 real use cases step-by-step prompts ke saath.</p>
        <ButtonLink href="/products/ai-se-smart-kaam" className="mt-5">Playbook dekhiye</ButtonLink>
      </div>
    </article>
  );
}
