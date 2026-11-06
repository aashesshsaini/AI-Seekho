import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  Briefcase,
  Clapperboard,
  GraduationCap,
  Laptop,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Store,
  Workflow,
  Languages,
  BadgeCheck,
  Hammer,
} from "lucide-react";
import { Badge, ButtonLink, Card, Section, SectionHeader } from "@/components/ui";
import { Reveal } from "@/components/ui/reveal";
import { HeroVisual } from "@/components/site/hero-visual";
import { BookMockup } from "@/components/product/book-mockup";
import { Faq } from "@/components/site/faq";
import { getProduct, getPublishedTools, getPublishedTutorials, getServices } from "@/lib/data/public";
import { formatINR } from "@/lib/money";
import { TUTORIAL_CATEGORIES } from "@/lib/models/content";

const LEARN = [
  { icon: Sparkles, title: "AI Basics", body: "AI aur chatbots andar se kaise kaam karte hain, kahan galat hote hain, aur unhe safely kaise use karein." },
  { icon: MessageSquareText, title: "Prompting", body: "Vague sawaal se structured prompt tak — taaki pehla jawab bhi kaam ka ho." },
  { icon: Clapperboard, title: "Content Creation", body: "Ideas, scripts, captions aur thumbnails — apni awaaz mein, AI ki speed ke saath." },
  { icon: Store, title: "AI for Business", body: "Offers, product descriptions, customer replies aur simple sales analysis." },
  { icon: GraduationCap, title: "Study & Career", body: "Notes, quiz, study plans, resume aur mock interviews — integrity ke saath." },
  { icon: Workflow, title: "Automation", body: "No-code tools se repetitive kaam automate karna — testing aur human approval ke saath." },
];

const PATHS = [
  { icon: GraduationCap, who: "Students", line: "Chapter se notes, quiz aur revision plan — AI ko tutor banaiye, ghost-writer nahi.", href: "/learn?category=students" },
  { icon: Clapperboard, who: "Content creators", line: "Niche research, scripts, Reels aur ek video ko 5 platforms par le jaana.", href: "/learn?category=content-creation" },
  { icon: Laptop, who: "Freelancers", line: "Client briefs, proposals aur delivery workflows ko tez aur consistent banaiye.", href: "/learn?category=productivity" },
  { icon: Briefcase, who: "Working professionals", line: "Emails, documents, meetings aur reports — roz ke kaam mein ghante bachaiye.", href: "/learn?category=productivity" },
  { icon: Store, who: "Small business owners", line: "Offers, catalog, customer FAQs aur Google Business Profile — bina agency ke.", href: "/learn?category=business" },
];

const WHY = [
  { icon: Languages, title: "Hinglish first", body: "Jaise aap sochte aur baat karte hain, waise hi seekhiye. Technical terms English mein, samjhaana seedhi bhasha mein." },
  { icon: Hammer, title: "Practical, task-first", body: "Har lesson ek real kaam se shuru hota hai — caption, notes, offer, report — theory baad mein." },
  { icon: BadgeCheck, title: "Verified, dated facts", body: "Tools ke free plans aur features badalte rehte hain. Hum har claim ke saath official source aur 'last verified' date dete hain." },
  { icon: ShieldCheck, title: "Safety aur privacy", body: "Fact-checking, data privacy aur honest use — har workflow mein built-in, add-on nahi." },
];

export default async function HomePage() {
  const [product, tutorials, tools, services] = await Promise.all([getProduct(), getPublishedTutorials(), getPublishedTools(), getServices()]);
  const priceLabel = product ? formatINR(product.pricePaise) : null;

  return (
    <>
      {/* ------------------------------------------------------------ Hero */}
      <section className="relative overflow-hidden" aria-labelledby="hero-title">
        <div aria-hidden className="grid-backdrop absolute inset-0" />
        <div aria-hidden className="absolute left-1/2 top-[-20%] h-[640px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(61_116_255/0.18),transparent)]" />
        <div className="container-page relative grid items-center gap-16 pb-20 pt-14 md:pt-20 lg:grid-cols-[1.08fr_1fr] lg:pb-28 lg:pt-24">
          <div>
            <p className="eyebrow">Learn. Create. Automate.</p>
            <h1 id="hero-title" className="display-xl mt-5 text-fg">
              AI Seekho.
              <br />
              <span className="text-gradient">Smart Kaam Karo.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-fg-muted md:text-xl">
              AI tools ko sirf explore mat karo. Unhe content, studies, business aur roz ke kaam mein practically use karna seekho.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/learn" size="lg">
                Explore AI Learning <ArrowRight className="h-4 w-4" aria-hidden />
              </ButtonLink>
              <ButtonLink href="/products/ai-se-smart-kaam" size="lg" variant="secondary">
                Get the AI Playbook
              </ButtonLink>
            </div>
            <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-fg-subtle">
              <li>Seedhi Hinglish</li>
              <li aria-hidden>·</li>
              <li>Real-life use cases</li>
              <li aria-hidden>·</li>
              <li>Verified tool information</li>
            </ul>
          </div>
          <HeroVisual />
        </div>
      </section>

      {/* --------------------------------------------------- What you learn */}
      <Section labelledBy="learn-title" className="border-t border-line">
        <SectionHeader id="learn-title" eyebrow="What you can learn" title="AI ko samjhiye. Phir use kaam par lagaiye." lead="Basics se lekar automation tak — har topic ek practical kaam ke around design kiya gaya hai." />
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LEARN.map((item, i) => (
            <Reveal key={item.title} delay={i * 0.04}>
              <Card className="h-full">
                <item.icon className="h-6 w-6 text-cyan-400" aria-hidden strokeWidth={1.6} />
                <h3 className="mt-5 text-lg font-semibold text-fg">{item.title}</h3>
                <p className="mt-2 leading-relaxed text-fg-muted">{item.body}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ---------------------------------------------------- Learning paths */}
      <Section labelledBy="paths-title" className="border-t border-line bg-ink-950/40">
        <div className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr]">
          <SectionHeader id="paths-title" eyebrow="Learning paths" title="Aap kaun hain, us hisaab se shuru kariye." lead="Har audience ka kaam alag hai. Apna path chuniye aur seedha relevant use cases par jaiye." />
          <ul className="divide-y divide-line border-y border-line">
            {PATHS.map((p) => (
              <li key={p.who}>
                <Link href={p.href} className="group flex items-start gap-5 py-6 transition-colors">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line-strong bg-white/[0.03]">
                    <p.icon className="h-5 w-5 text-cyan-400" aria-hidden strokeWidth={1.7} />
                  </span>
                  <span className="flex-1">
                    <span className="block text-lg font-semibold text-fg">{p.who}</span>
                    <span className="mt-1 block leading-relaxed text-fg-muted">{p.line}</span>
                  </span>
                  <ArrowRight className="mt-2 h-5 w-5 shrink-0 text-fg-subtle transition-transform group-hover:translate-x-1 group-hover:text-cyan-400" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* ---------------------------------------------------- Featured book */}
      {product && (
        <Section labelledBy="book-title" className="relative overflow-hidden border-t border-line">
          <div aria-hidden className="absolute right-[-10%] top-1/2 h-[600px] w-[600px] -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(95_225_242/0.12),transparent)]" />
          <div className="relative grid items-center gap-16 lg:grid-cols-[1fr_0.85fr]">
            <div className="order-2 lg:order-1">
              <p className="eyebrow">Featured · The Practical AI Playbook</p>
              <h2 id="book-title" className="display-lg mt-4 text-fg">
                AI SE SMART KAAM
              </h2>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-fg-muted">{product.shortDescription}</p>
              <ul className="mt-8 grid max-w-lg grid-cols-2 gap-x-6 gap-y-3 text-[0.95rem] text-fg">
                {product.highlights.map((h) => (
                  <li key={h} className="flex items-center gap-2.5">
                    <BookOpenCheck className="h-4 w-4 shrink-0 text-cyan-400" aria-hidden />
                    {h}
                  </li>
                ))}
              </ul>
              <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <ButtonLink href="/products/ai-se-smart-kaam" size="lg">
                  {product.active && priceLabel ? `Get AI SE SMART KAAM — ${priceLabel}` : "View the Playbook"}
                </ButtonLink>
                <span className="text-sm text-fg-subtle">4 PDFs · A4 + Phone editions · Instant download</span>
              </div>
            </div>
            <div className="order-1 mx-auto w-[min(72vw,340px)] lg:order-2">
              <BookMockup />
            </div>
          </div>
        </Section>
      )}

      {/* --------------------------------------------------------- Tutorials */}
      <Section labelledBy="tut-title" className="border-t border-line">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <SectionHeader id="tut-title" eyebrow="Free tutorials" title="Aaj hi kuch naya seekhiye." lead="Chhote, practical articles — bina jargon ke." />
          <ButtonLink href="/learn" variant="secondary">
            Saare tutorials <ArrowRight className="h-4 w-4" aria-hidden />
          </ButtonLink>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {tutorials.slice(0, 3).map((t) => (
            <Link key={t.slug} href={`/learn/${t.slug}`} className="surface group flex flex-col p-6 transition-colors hover:border-line-strong md:p-7">
              <Badge tone="cyan" className="self-start">
                {TUTORIAL_CATEGORIES.find((c) => c.slug === t.category)?.label ?? t.category}
              </Badge>
              <h3 className="mt-5 text-lg font-semibold leading-snug text-fg group-hover:text-cyan-300">{t.title}</h3>
              <p className="mt-3 flex-1 leading-relaxed text-fg-muted">{t.excerpt}</p>
              <p className="mt-6 text-sm text-fg-subtle">{t.readingMinutes} min read</p>
            </Link>
          ))}
        </div>
      </Section>

      {/* ------------------------------------------------- Tools & workflows */}
      <Section labelledBy="tools-title" className="border-t border-line bg-ink-950/40">
        <div className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <SectionHeader
              id="tools-title"
              eyebrow="Practical AI tools & workflows"
              title="Sahi kaam ke liye sahi tool."
              lead="Har tool ke saath: kis kaam ke liye best hai, kya limitations hain, aur information last kab verify hui."
            />
            <ButtonLink href="/tools" variant="secondary" className="mt-8">
              AI Tools directory <ArrowRight className="h-4 w-4" aria-hidden />
            </ButtonLink>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {tools.slice(0, 6).map((t) => (
              <li key={t.slug}>
                <Link href={`/tools/${t.slug}`} className="surface flex h-full flex-col p-5 transition-colors hover:border-line-strong">
                  <span className="font-semibold text-fg">{t.name}</span>
                  <span className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-fg-muted">{t.description}</span>
                  {t.lastVerifiedAt && (
                    <span className="mt-3 text-xs text-fg-subtle">
                      Last verified {new Date(t.lastVerifiedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* ---------------------------------------------------------- Services */}
      <Section labelledBy="services-title" className="border-t border-line">
        <SectionHeader id="services-title" eyebrow="AI services" title="Apne business ke liye AI setup chahiye?" lead="Video content, editing, automation aur custom AI workflows — scope aur pricing har project ke liye alag se discuss hoti hai." />
        <ul className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <li key={s.slug}>
              <Card className="h-full">
                <h3 className="text-lg font-semibold text-fg">{s.title}</h3>
                <p className="mt-2 leading-relaxed text-fg-muted">{s.summary}</p>
              </Card>
            </li>
          ))}
        </ul>
        <ButtonLink href="/services" variant="secondary" className="mt-10">
          Services aur enquiry <ArrowRight className="h-4 w-4" aria-hidden />
        </ButtonLink>
      </Section>

      {/* --------------------------------------------------------------- Why */}
      <Section labelledBy="why-title" className="border-t border-line bg-ink-950/40">
        <SectionHeader id="why-title" eyebrow="Why AI SEEKHO" title="Seekhne ka tareeka jo aapke kaam aaye." align="center" />
        <div className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {WHY.map((w) => (
            <div key={w.title}>
              <w.icon className="h-6 w-6 text-cyan-400" aria-hidden strokeWidth={1.6} />
              <h3 className="mt-5 font-semibold text-fg">{w.title}</h3>
              <p className="mt-2 text-[0.97rem] leading-relaxed text-fg-muted">{w.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* --------------------------------------------------------------- FAQ */}
      <Section labelledBy="faq-title" className="border-t border-line">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeader id="faq-title" eyebrow="FAQ" title="Aksar pooche jaane wale sawaal" />
          <Faq
            items={[
              { q: "AI SEEKHO kya hai?", a: "AI SEEKHO ek AI education brand hai jo Indian learners ko AI tools practically use karna sikhata hai — tutorials, tools directory, digital playbooks aur services ke through, seedhi Hinglish mein." },
              { q: "Kya mujhe coding aani chahiye?", a: "Nahi. Saari learning beginner-friendly hai. Automation wale topics bhi no-code tools se sikhaye jaate hain." },
              { q: "Kya AI tools free hain?", a: "Kai tools ke free plans hote hain, par limits ke saath — aur yeh limits badalti rehti hain. Isliye hamare tools directory mein har tool ke saath official source aur 'last verified' date di gayi hai." },
              {
                q: "AI SE SMART KAAM playbook kaise milti hai?",
                a: (
                  <>
                    Payment verify hote hi aapko 4 PDFs (Reader + Bonus Toolkit, A4 aur Phone editions) ka secure download milta hai.{" "}
                    <Link href="/products/ai-se-smart-kaam" className="text-cyan-400 underline">
                      Details dekhiye
                    </Link>
                    .
                  </>
                ),
              },
              { q: "Payment safe hai?", a: "Payments Razorpay process karta hai. Aapke card, UPI ya bank details hamare servers par store nahi hote." },
            ]}
          />
        </div>
      </Section>
    </>
  );
}
