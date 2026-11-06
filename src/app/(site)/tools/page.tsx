import type { Metadata } from "next";
import { getPublishedTools } from "@/lib/data/public";
import { TOOL_CATEGORIES } from "@/lib/models/content";
import { ToolBrowser } from "@/components/site/tool-browser";
import { Notice } from "@/components/ui";

export const metadata: Metadata = {
  title: "AI Tools directory",
  description: "Practical AI tools — use cases, limitations, pricing classification aur last-verified date ke saath. Hinglish mein.",
  alternates: { canonical: "/tools" },
};

export default async function ToolsPage() {
  const tools = await getPublishedTools();
  return (
    <>
      <section className="border-b border-line">
        <div className="container-page pb-14 pt-14 md:pt-20">
          <p className="eyebrow">AI Tools</p>
          <h1 className="display-xl mt-4 max-w-3xl text-fg">Tools jo sach mein kaam aate hain.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-fg-muted">
            Har tool ke saath: kis kaam ke liye best hai, kya limitations hain, aur information kis official source se, kab verify hui.
          </p>
        </div>
      </section>
      <div className="container-page py-14">
        <Notice className="mb-10" title="Free plans badalte rehte hain">
          Pricing aur free limits har mahine badal sakti hain. Yahan wahi likha hai jo verify karne ki date par official page par tha. Koi bhi paid
          decision lene se pehle tool ka official pricing page khud dekhiye. Paid plans ki keemat jaan-boojhkar nahi di gayi.
        </Notice>
        <ToolBrowser
          tools={tools.map(({ slug, name, description, category, pricingClass, verificationStatus, lastVerifiedAt }) => ({ slug, name, description, category, pricingClass, verificationStatus, lastVerifiedAt }))}
          categories={TOOL_CATEGORIES}
        />
      </div>
    </>
  );
}
