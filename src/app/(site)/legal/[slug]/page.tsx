import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLegalPage } from "@/lib/data/public";
import { LEGAL_PAGES, type LegalSlug } from "@/lib/models/system";
import { Markdown } from "@/lib/markdown";
import { Notice } from "@/components/ui";

export function generateStaticParams() {
  return LEGAL_PAGES.map((p) => ({ slug: p.slug }));
}

function isLegal(slug: string): slug is LegalSlug {
  return LEGAL_PAGES.some((p) => p.slug === slug);
}

export async function generateMetadata({ params }: PageProps<"/legal/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  if (!isLegal(slug)) return {};
  const page = await getLegalPage(slug);
  // Draft legal pages should not be indexed.
  return { title: page.title, alternates: { canonical: `/legal/${slug}` }, robots: page.approved ? undefined : { index: false, follow: true } };
}

export default async function LegalPage({ params }: PageProps<"/legal/[slug]">) {
  const { slug } = await params;
  if (!isLegal(slug)) notFound();
  const page = await getLegalPage(slug);
  return (
    <article className="container-page max-w-3xl py-14 md:py-20">
      <p className="eyebrow">Legal</p>
      <h1 className="display-lg mt-4 text-fg">{page.title}</h1>
      {page.updatedAt && (
        <p className="mt-4 text-sm text-fg-subtle">
          Last updated {new Date(page.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      )}
      {!page.approved && (
        <Notice tone="warning" className="mt-8" title="Draft">
          Yeh policy abhi draft hai aur owner dwara final approve nahi hui hai.
        </Notice>
      )}
      <div className="mt-10">
        <Markdown source={page.body} />
      </div>
    </article>
  );
}
