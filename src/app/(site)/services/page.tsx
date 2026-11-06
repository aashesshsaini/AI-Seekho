import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { getServices } from "@/lib/data/public";
import { Card, Section, SectionHeader } from "@/components/ui";
import { EnquiryForm } from "@/components/forms/enquiry-form";

export const metadata: Metadata = {
  title: "AI Services — video, automation aur custom workflows",
  description: "AI video content, AI-assisted editing, business automation, custom AI workflows aur AI content systems — project enquiry bhejiye.",
  alternates: { canonical: "/services" },
};

const PROCESS = [
  ["Discovery call", "Aapka goal, current process aur constraints samajhna."],
  ["Scope aur quote", "Kya deliver hoga, timeline, aur cost — likhit mein, kaam shuru hone se pehle."],
  ["Build aur review", "Kaam aapke feedback ke saath step-by-step; har AI output ka human review."],
  ["Handover", "Files, workflows aur simple documentation, taaki aap khud chala sakein."],
];

export default async function ServicesPage() {
  const services = await getServices();
  return (
    <>
      <section className="border-b border-line">
        <div className="container-page pb-14 pt-14 md:pt-20">
          <p className="eyebrow">AI Services</p>
          <h1 className="display-xl mt-4 max-w-3xl text-fg">AI ko apne business mein practically lagaiye.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-fg-muted">
            Content, editing aur automation ke liye done-with-you services. Har project ka scope aur pricing alag se discuss hota hai — koi hidden
            commitment nahi.
          </p>
        </div>
      </section>

      <Section labelledBy="svc">
        <h2 id="svc" className="sr-only">Services</h2>
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <li key={s.slug}>
              <Card className="h-full">
                <h3 className="text-lg font-semibold text-fg">{s.title}</h3>
                <p className="mt-2 leading-relaxed text-fg-muted">{s.summary}</p>
                <ul className="mt-5 space-y-2 text-sm">
                  {s.deliverables.map((d) => (
                    <li key={d} className="flex gap-2 text-fg">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" aria-hidden /> {d}
                    </li>
                  ))}
                </ul>
              </Card>
            </li>
          ))}
        </ul>
      </Section>

      <Section labelledBy="process" className="border-t border-line bg-ink-950/40">
        <SectionHeader id="process" eyebrow="How it works" title="Simple, transparent process" />
        <ol className="mt-12 grid gap-8 md:grid-cols-4">
          {PROCESS.map(([t, b], i) => (
            <li key={t}>
              <span className="font-[family-name:var(--font-display)] text-sm font-semibold text-cyan-400">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-3 font-semibold text-fg">{t}</h3>
              <p className="mt-2 text-[0.97rem] leading-relaxed text-fg-muted">{b}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section labelledBy="enquire" className="border-t border-line">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeader id="enquire" eyebrow="Enquiry" title="Project ke baare mein bataiye" lead="Form bhejiye — hum scope samajhkar reply karenge. Enquiry bhejna kisi commitment ke barabar nahi hai." />
          <EnquiryForm kind="service" services={services.map((s) => ({ slug: s.slug, title: s.title }))} />
        </div>
      </Section>
    </>
  );
}
