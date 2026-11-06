import type { Metadata } from "next";
import { Suspense } from "react";
import { getPublishedTutorials } from "@/lib/data/public";
import { TUTORIAL_CATEGORIES } from "@/lib/models/content";
import { TutorialBrowser } from "@/components/site/tutorial-browser";
import { ButtonLink } from "@/components/ui";

export const metadata: Metadata = {
  title: "Learn AI — free Hinglish tutorials",
  description: "AI basics, prompt engineering, content creation, students, business, productivity aur automation — practical Hinglish tutorials.",
  alternates: { canonical: "/learn" },
};

export default async function LearnPage() {
  const tutorials = await getPublishedTutorials();
  const list = tutorials.map(({ slug, title, excerpt, category, readingMinutes, level }) => ({ slug, title, excerpt, category, readingMinutes, level }));
  return (
    <>
      <section className="border-b border-line">
        <div className="container-page pb-14 pt-14 md:pt-20">
          <p className="eyebrow">Learn AI</p>
          <h1 className="display-xl mt-4 max-w-3xl text-fg">Practical AI, ek kaam ek baar mein.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-fg-muted">
            Chhote, focused tutorials — seedhi Hinglish mein. Har article ek real kaam par based hai, aur jahan zaroori ho wahan official source diya gaya hai.
          </p>
        </div>
      </section>
      <div className="container-page py-14">
        <Suspense fallback={<div className="h-96" aria-hidden />}>
          <TutorialBrowser tutorials={list} categories={TUTORIAL_CATEGORIES} />
        </Suspense>
        <div className="surface mt-16 flex flex-col items-start justify-between gap-6 p-8 md:flex-row md:items-center">
          <div>
            <p className="font-semibold text-fg">Poora, step-by-step system chahiye?</p>
            <p className="mt-1 text-fg-muted">25 use cases, 100 prompts aur 10 workflows — AI SE SMART KAAM playbook mein.</p>
          </div>
          <ButtonLink href="/products/ai-se-smart-kaam">Playbook dekhiye</ButtonLink>
        </div>
      </div>
    </>
  );
}
