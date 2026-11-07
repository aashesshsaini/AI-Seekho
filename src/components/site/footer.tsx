import Link from "next/link";
import { Logo } from "@/components/ui";
import { getSettings } from "@/lib/data/public";
import { ConsentSettingsLink } from "./consent";

const COLUMNS = [
  {
    title: "Learn",
    links: [
      { href: "/learn", label: "Learn AI" },
      { href: "/tools", label: "AI Tools directory" },
      { href: "/products/ai-se-smart-kaam", label: "AI SE SMART KAAM" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/services", label: "AI Services" },
      { href: "/contact", label: "Contact" },
      { href: "/recover", label: "Download recover kariye" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/legal/privacy-policy", label: "Privacy Policy" },
      { href: "/legal/terms", label: "Terms & Conditions" },
      { href: "/legal/refund-policy", label: "Refund & Cancellation" },
      { href: "/legal/delivery-policy", label: "Digital Delivery" },
      { href: "/legal/support", label: "Support Information" },
    ],
  },
];

export async function SiteFooter() {
  "use cache";
  // A failed settings read must not take down every page — render without the support email.
  const settings = await getSettings().catch(() => ({
    tagline: "Learn. Create. Automate.",
    supportEmail: "",
    business: { legalName: "" },
  }));
  return (
    <footer className="hairline-top mt-auto border-t border-line bg-ink-950/60">
      <div className="container-page grid gap-12 py-16 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-5 text-sm leading-relaxed text-fg-muted">
            {settings.tagline} — har Indian ke liye practical AI education, seedhi Hinglish mein.
          </p>
          {settings.supportEmail && (
            <p className="mt-4 text-sm text-fg-muted">
              Support:{" "}
              <a className="text-cyan-400 hover:underline" href={`mailto:${settings.supportEmail}`}>
                {settings.supportEmail}
              </a>
            </p>
          )}
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-fg-subtle">{col.title}</h2>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-fg-muted transition-colors hover:text-fg">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="container-page flex flex-col gap-3 py-6 text-xs text-fg-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {settings.business.legalName || "AI SEEKHO"}. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <ConsentSettingsLink />
            <p>Payments securely processed by Razorpay.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
