import type { Metadata, Viewport } from "next";
import { Inter, Inter_Tight } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const interTight = Inter_Tight({ subsets: ["latin"], variable: "--font-inter-tight", display: "swap", weight: ["600", "700"] });

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "AI SEEKHO — Learn. Create. Automate.",
    template: "%s · AI SEEKHO",
  },
  description:
    "AI SEEKHO: Indian students, creators, freelancers, professionals aur small business owners ke liye practical AI education — seedhi Hinglish mein.",
  applicationName: "AI SEEKHO",
  openGraph: {
    type: "website",
    siteName: "AI SEEKHO",
    locale: "en_IN",
    images: [{ url: "/images/og-default.png", width: 1200, height: 630, alt: "AI SEEKHO — Learn. Create. Automate." }],
  },
  twitter: { card: "summary_large_image", images: ["/images/og-default.png"] },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#070b1a",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN" className={`${inter.variable} ${interTight.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
