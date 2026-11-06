import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Download, FileText, Mail, ShieldCheck, Smartphone, Monitor } from "lucide-react";
import { Badge, Card, Notice, Section, SectionHeader } from "@/components/ui";
import { BookMockup } from "@/components/product/book-mockup";
import { BuyButton } from "@/components/checkout/buy-button";
import { StickyCta } from "@/components/checkout/sticky-cta";
import { Faq } from "@/components/site/faq";
import { TrackOnMount } from "@/components/site/consent";
import { getProduct, getSettings } from "@/lib/data/public";
import { formatINR, paiseToRupeeString } from "@/lib/money";
import { PRODUCT_SLUG } from "@/lib/content/seed";

export async function generateMetadata(): Promise<Metadata> {
  const p = await getProduct(PRODUCT_SLUG);
  if (!p) return {};
  const title = p.seoTitle || `${p.name} — The Practical AI Playbook`;
  const description = p.seoDescription || p.shortDescription;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/products/${PRODUCT_SLUG}` },
    openGraph: { title, description, type: "website", url: `/products/${PRODUCT_SLUG}`, images: [{ url: "/images/product/og-playbook.png", width: 1200, height: 630, alt: p.name }] },
    twitter: { card: "summary_large_image", title, description, images: ["/images/product/og-playbook.png"] },
  };
}

const STATS = [
  { n: "8", l: "learning sections" },
  { n: "25", l: "practical use cases" },
  { n: "100", l: "ready-to-use prompts" },
  { n: "10", l: "complete workflows" },
  { n: "27", l: "bonus resources" },
  { n: "30", l: "day challenge" },
];

const SECTIONS = [
  "AI Ko Samjhein",
  "AI Se Sahi Kaam Kaise Karwayein (Mastering AI Prompts)",
  "AI for Content Creators",
  "AI for Small Business Owners",
  "AI for Students and Job Seekers",
  "AI for Everyday Productivity",
  "No-Code AI aur Simple Automation",
  "30-Day AI Transformation Challenge",
];

const AUDIENCES = [
  {
    who: "Content creators",
    items: ["Niche research aur 30-idea content bank", "Hinglish YouTube script — apni awaaz mein", "Reel script, caption aur hashtags", "Ek video → 5 platforms"],
  },
  {
    who: "Small business owners",
    items: ["Restaurant ka weekend/festival offer campaign", "Clothing store ka catalog aur product descriptions", "Clinic ka patient FAQ reply bank", "Google Sheets mein sales aur stock analysis"],
  },
  {
    who: "Students & job seekers",
    items: ["Chapter → notes → quiz → audio revision", "Exam study plan, practice aur doubt solving", "JD-tailored resume aur LinkedIn profile", "Voice mode mein mock interview"],
  },
  {
    who: "Working professionals",
    items: ["Reusable message templates", "Lambe document ko samajhna", "Staff FAQ assistant", "Enquiry alert — simple no-code automation"],
  },
];

const FILES = [
  { icon: Monitor, name: "Reader Edition — A4", meta: "154 pages · laptop, tablet ya print ke liye" },
  { icon: Smartphone, name: "Reader Edition — Phone", meta: "471 pages · mobile par aaram se padhne ke liye" },
  { icon: Monitor, name: "Bonus Toolkit — A4", meta: "49 pages · B1–B27 bonuses" },
  { icon: Smartphone, name: "Bonus Toolkit — Phone", meta: "159 pages · B1–B27 bonuses, phone layout" },
];

const PREVIEW_LABELS = ["Contents", "Apna track chunein", "RASTA method", "30-day challenge", "100 prompts (B1)"];

function jsonLd(data: unknown) {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}

export default async function ProductPage() {
  const [product, settings] = await Promise.all([getProduct(PRODUCT_SLUG), getSettings()]);
  if (!product) notFound();
  const price = formatINR(product.pricePaise);
  const cta = `Get AI SE SMART KAAM — ${price}`;
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

  const structured = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${product.name} — The Practical AI Playbook`,
    description: product.shortDescription,
    image: [`${siteUrl}${product.coverImage}`],
    brand: { "@type": "Brand", name: "AI SEEKHO" },
    category: "E-book",
    ...(product.active
      ? {
          offers: {
            "@type": "Offer",
            url: `${siteUrl}/products/${product.slug}`,
            priceCurrency: "INR",
            price: paiseToRupeeString(product.pricePaise),
            availability: "https://schema.org/InStock",
          },
        }
      : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structured)} />
      <TrackOnMount event="view_item" value={product.pricePaise / 100} currency="INR" item_id={product.slug} />

      {/* ------------------------------------------------------------ Hero */}
      <section className="relative overflow-hidden border-b border-line" aria-labelledby="product-title">
        <div aria-hidden className="absolute left-[-10%] top-0 h-[700px] w-[700px] rounded-full bg-[radial-gradient(closest-side,rgb(61_116_255/0.16),transparent)]" />
        <div className="container-page relative grid items-center gap-12 pb-16 pt-10 md:pt-16 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20 lg:pb-24">
          <div className="mx-auto w-[min(46vw,380px)] py-4 lg:w-[min(68vw,380px)] lg:py-10">
            <BookMockup priority sizes="(min-width: 1024px) 380px, 46vw" />
          </div>
          <div>
            <nav aria-label="Breadcrumb" className="text-sm text-fg-subtle">
              <Link href="/" className="hover:text-fg">Home</Link> <span aria-hidden>/</span> <span>Playbook</span>
            </nav>
            <p className="eyebrow mt-6">The Practical AI Playbook · Hinglish e-book</p>
            <h1 id="product-title" className="display-xl mt-4 text-fg">
              AI SE <span className="text-gradient">SMART KAAM</span>
            </h1>
            <p className="mt-5 text-xl leading-relaxed text-fg">Roz ke kaam ke liye AI — seedhi Hinglish mein.</p>
            <p className="mt-4 max-w-xl leading-relaxed text-fg-muted">{product.shortDescription}</p>

            <div className="mt-8 flex items-end gap-3">
              <span className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight text-fg">{price}</span>
              <span className="pb-1.5 text-sm text-fg-subtle">Launch price · INR · final amount Razorpay checkout par dikhega</span>
            </div>

            <div className="mt-6" id="buy">
              {product.active ? (
                <BuyButton label={cta} productSlug={product.slug} className="w-full sm:w-auto" />
              ) : (
                <Notice tone="warning" title="Abhi available nahi">Yeh product abhi sale ke liye active nahi hai.</Notice>
              )}
            </div>

            <ul className="mt-7 grid gap-2.5 text-sm text-fg-muted sm:grid-cols-2">
              <li className="flex items-center gap-2"><Download className="h-4 w-4 text-cyan-400" aria-hidden /> Verified payment ke baad instant download</li>
              <li className="flex items-center gap-2"><FileText className="h-4 w-4 text-cyan-400" aria-hidden /> 4 PDFs — A4 + Phone editions</li>
              <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-cyan-400" aria-hidden /> Razorpay secure checkout</li>
              <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-cyan-400" aria-hidden /> Download link kho jaye toh recovery</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- Stats */}
      <section aria-label="Kya-kya andar hai" className="border-b border-line bg-ink-950/40">
        <div className="container-page grid grid-cols-2 divide-line py-10 sm:grid-cols-3 lg:grid-cols-6 lg:divide-x">
          {STATS.map((s) => (
            <div key={s.l} className="px-4 py-4 text-center">
              <p className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight text-fg">{s.n}</p>
              <p className="mt-1 text-sm text-fg-muted">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------- Value prop */}
      <Section labelledBy="why-book">
        <div className="grid gap-14 lg:grid-cols-2">
          <SectionHeader
            id="why-book"
            eyebrow="Kyun yeh playbook"
            title="AI ke baare mein padhna kaafi nahi. Use kaam par lagana seekhiye."
            lead="Har use case ek real situation se shuru hota hai — problem, tool, step-by-step prompt, expected output, aur verify karne ka tareeka. Theory kam, kaam zyada."
          />
          <div className="space-y-4">
            {[
              ["RASTA prompting method", "Role · Aim · Situation · Type · Add-ons — ek simple checklist jo vague prompts ko kaam ke prompts mein badalti hai. Roz ke kaam ke liye RASTA-lite bhi."],
              ["Apna track chuniye", "Creator, Business owner, Student / Job seeker ya Working professional — book ko shuru se aakhir tak padhna zaroori nahi."],
              ["Honest aur verified", "Tools ke naam, features aur free limits official sources se 5 Nov 2026 tak check kiye gaye; har claim ke saath 'last verified' date (B27)."],
              ["Safety built-in", "Fact-check, privacy, data safety aur integrity checklists — har section mein."],
            ].map(([t, b]) => (
              <Card key={t}>
                <h3 className="font-semibold text-fg">{t}</h3>
                <p className="mt-2 leading-relaxed text-fg-muted">{b}</p>
              </Card>
            ))}
          </div>
        </div>
      </Section>

      {/* --------------------------------------------------------- Audiences */}
      <Section labelledBy="who" className="border-t border-line bg-ink-950/40">
        <SectionHeader id="who" eyebrow="Kiske liye" title="25 use cases — aapke kaam ke hisaab se." lead="Kuch examples, seedhe book ke chapters se:" />
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {AUDIENCES.map((a) => (
            <Card key={a.who}>
              <h3 className="text-lg font-semibold text-fg">{a.who}</h3>
              <ul className="mt-4 space-y-2.5">
                {a.items.map((i) => (
                  <li key={i} className="flex gap-2.5 text-fg-muted">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" aria-hidden />
                    {i}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
        <p className="mt-6 text-sm text-fg-subtle">Sabke liye: viral WhatsApp forward ko fact-check karna, apni prompt library banana, aur kharab output ko 3 rounds mein theek karna.</p>
      </Section>

      {/* ---------------------------------------------------------- Sections */}
      <Section labelledBy="toc">
        <div className="grid gap-14 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeader id="toc" eyebrow="Andar kya hai" title="8 sections + 27 bonuses" lead="Bonus mein: 100 prompts (B1–B10), 30-day content calendar, small business aur student toolkits, 10 complete workflows, 40-word glossary aur verified tools snapshot." />
          <ol className="divide-y divide-line border-y border-line">
            {SECTIONS.map((s, i) => (
              <li key={s} className="flex items-baseline gap-5 py-4">
                <span className="w-8 shrink-0 font-[family-name:var(--font-display)] text-sm font-semibold text-cyan-400">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-fg">{s}</span>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      {/* ---------------------------------------------------------- Preview */}
      <Section labelledBy="preview" className="border-t border-line bg-ink-950/40">
        <SectionHeader id="preview" eyebrow="Andar ek nazar" title="Selected preview pages" lead="Book ke kuch asli pages. Poori book purchase ke baad milti hai." />
        <ul tabIndex={0} aria-label="Preview pages (scroll horizontally)" className="mt-12 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [scrollbar-width:thin] lg:grid lg:grid-cols-5 lg:overflow-visible">
          {product.previewImages.map((img, i) => (
            <li key={img.src} className="w-[68vw] max-w-[280px] shrink-0 snap-start lg:w-auto lg:max-w-none">
              <figure>
                <div className="relative aspect-[795/1123] overflow-hidden rounded-lg border border-line bg-white shadow-[var(--shadow-card)]">
                  <Image src={img.src} alt={img.alt} fill sizes="(min-width: 1024px) 220px, 68vw" className="object-cover object-top" loading="lazy" />
                </div>
                <figcaption className="mt-3 text-sm text-fg-muted">{PREVIEW_LABELS[i] ?? `Preview ${i + 1}`}</figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </Section>

      {/* ------------------------------------------------------ What you get */}
      <Section labelledBy="files">
        <div className="grid gap-14 lg:grid-cols-2">
          <div>
            <SectionHeader id="files" eyebrow="Aapko kya milega" title="4 PDFs, ek secure download" />
            <Notice className="mt-8" title="Digital download disclosure">
              Yeh ek digital product hai — koi physical book ship nahi hoti. Payment Razorpay se verify hone ke baad aapko ek ZIP (sabhi 4 PDFs) ya
              har PDF alag se download karne ka secure link milta hai. Personal link 180 din tak valid rehta hai. Files sirf aapke personal use ke
              liye hain — kripya share ya resell na karein. Details:{" "}
              <Link href="/legal/delivery-policy" className="text-cyan-400 underline">Digital Delivery Policy</Link> ·{" "}
              <Link href="/legal/refund-policy" className="text-cyan-400 underline">Refund Policy</Link>.
            </Notice>
          </div>
          <ul className="space-y-3">
            {FILES.map((f) => (
              <li key={f.name} className="surface flex items-center gap-4 p-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10">
                  <f.icon className="h-5 w-5 text-cyan-400" aria-hidden />
                </span>
                <span>
                  <span className="block font-semibold text-fg">{f.name}</span>
                  <span className="text-sm text-fg-muted">{f.meta}</span>
                </span>
                <Badge className="ml-auto">PDF</Badge>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* --------------------------------------------------------------- FAQ */}
      <Section labelledBy="pfaq" className="border-t border-line bg-ink-950/40">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeader id="pfaq" eyebrow="FAQ" title="Kharidne se pehle" />
          <Faq
            items={[
              { q: "Kya yeh book bilkul beginners ke liye hai?", a: "Haan. Section 1 AI ko seedhi bhasha mein samjhata hai aur 'Quick start' se aap 30 minute mein pehla kaam kar sakte hain. Koi coding nahi chahiye." },
              { q: "Book kis language mein hai?", a: "Roman Hinglish mein — jaise hum roz baat karte hain. Tools ke naam aur technical terms English mein hain." },
              { q: "Kya mujhe paid AI tools lene padenge?", a: "Book ke exercises zyadatar free plans par ho jaate hain. Free plans ki limits badalti rehti hain; book ka B27 section batata hai ki kaunsi baat kab aur kis official source se verify hui." },
              { q: "Phone par padh sakte hain?", a: "Haan — Reader Edition aur Bonus Toolkit dono ka alag Phone edition hai, jo mobile screen ke liye design kiya gaya hai." },
              { q: "Payment ke baad file kaise milegi?", a: "Payment verify hote hi order page par download links dikhenge. Agar payment ho gaya par page band ho gaya, toh 'Download recover kariye' page use kariye." },
              { q: "Kya isse income ya result ki guarantee hai?", a: "Nahi. Yeh book kaam karne ke tareeke sikhati hai. Natije aapki mehnat, market aur halaat par depend karte hain." },
              {
                q: "Refund policy kya hai?",
                a: (
                  <>
                    Kripya <Link href="/legal/refund-policy" className="text-cyan-400 underline">Refund aur Cancellation Policy</Link> padhiye.
                  </>
                ),
              },
            ]}
          />
        </div>
      </Section>

      {/* ------------------------------------------------------------ Final */}
      <Section labelledBy="final" className="border-t border-line">
        <div className="surface relative overflow-hidden px-6 py-14 text-center md:px-14">
          <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
          <h2 id="final" className="display-md text-fg">Aaj se AI ko apne kaam par lagaiye.</h2>
          <p className="mx-auto mt-4 max-w-xl text-fg-muted">25 use cases · 100 prompts · 10 workflows · 27 bonuses · 30-day challenge</p>
          <div className="mt-8 flex justify-center">
            {product.active && <BuyButton label={cta} productSlug={product.slug} />}
          </div>
          <p className="mt-6 text-sm text-fg-subtle">
            Sawaal hai?{" "}
            {settings.supportEmail ? (
              <a href={`mailto:${settings.supportEmail}`} className="text-cyan-400 underline">{settings.supportEmail}</a>
            ) : (
              <Link href="/contact" className="text-cyan-400 underline">Contact kariye</Link>
            )}
          </p>
        </div>
      </Section>

      {product.active && <StickyCta price={price} />}
      <div className="h-20 lg:hidden" aria-hidden />
    </>
  );
}
