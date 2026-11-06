import type { Metadata } from "next";
import Link from "next/link";
import { Mail, LifeBuoy } from "lucide-react";
import { getSettings } from "@/lib/data/public";
import { EnquiryForm } from "@/components/forms/enquiry-form";
import { Card } from "@/components/ui";

export const metadata: Metadata = {
  title: "Contact",
  description: "AI SEEKHO se contact kariye — orders, downloads, partnerships ya general sawaal.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const settings = await getSettings();
  return (
    <div className="container-page py-14 md:py-20">
      <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <p className="eyebrow">Contact</p>
          <h1 className="display-lg mt-4 text-fg">Baat kariye.</h1>
          <p className="mt-5 text-lg leading-relaxed text-fg-muted">Order, download, ya koi bhi sawaal — form bhejiye ya seedha email kariye.</p>
          <div className="mt-10 space-y-4">
            <Card className="flex gap-4">
              <Mail className="h-5 w-5 shrink-0 text-cyan-400" aria-hidden />
              <div>
                <p className="font-semibold text-fg">Email support</p>
                {settings.supportEmail ? (
                  <a href={`mailto:${settings.supportEmail}`} className="mt-1 block text-cyan-400 underline">{settings.supportEmail}</a>
                ) : (
                  <p className="mt-1 text-sm text-fg-muted">Support email abhi configure nahi hua — kripya form use kariye.</p>
                )}
                {settings.supportHours && <p className="mt-1 text-sm text-fg-subtle">{settings.supportHours}</p>}
              </div>
            </Card>
            <Card className="flex gap-4">
              <LifeBuoy className="h-5 w-5 shrink-0 text-cyan-400" aria-hidden />
              <div>
                <p className="font-semibold text-fg">Download link kho gaya?</p>
                <p className="mt-1 text-sm text-fg-muted">
                  <Link href="/recover" className="text-cyan-400 underline">Recovery page</Link> par email aur order reference daaliye.
                </p>
              </div>
            </Card>
          </div>
        </div>
        <EnquiryForm kind="contact" />
      </div>
    </div>
  );
}
