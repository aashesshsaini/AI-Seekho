import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { findEntitlementByToken, listDownloadableFiles } from "@/lib/entitlements";
import { Order } from "@/lib/models/commerce";
import { ButtonLink, Notice } from "@/components/ui";
import { FileList } from "@/components/checkout/file-list";

export const metadata: Metadata = { title: "Your downloads", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default function DownloadPage({ params }: PageProps<"/download/[token]">) {
  return (
    <div className="container-page max-w-3xl py-14 md:py-20">
      <Suspense fallback={<p className="text-fg-muted">Loading…</p>}>
        <DownloadView params={params} />
      </Suspense>
    </div>
  );
}

const REASONS: Record<string, string> = {
  not_found: "Yeh download link valid nahi hai. Ho sakta hai naya link issue hone par purana link band ho gaya ho.",
  expired: "Yeh download link expire ho gaya hai.",
  revoked: "Is purchase ka download access band kar diya gaya hai (jaise refund ke baad).",
  order_not_paid: "Is order ka payment verified nahi hai.",
};

async function DownloadView({ params }: { params: Promise<{ token: string }> }) {
  await connection();
  const { token } = await params;
  const check = await findEntitlementByToken(token);
  if (!check.ok) {
    return (
      <div>
        <h1 className="display-md text-fg">Download available nahi hai</h1>
        <p className="mt-4 leading-relaxed text-fg-muted">{REASONS[check.reason]}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/recover">Naya link mangaiye</ButtonLink>
          <ButtonLink href="/contact" variant="secondary">Support</ButtonLink>
        </div>
      </div>
    );
  }
  const ent = check.entitlement;
  const [files, order] = await Promise.all([listDownloadableFiles(ent), Order.findById(ent.orderId, { publicId: 1, productName: 1 }).lean()]);
  const remaining = Math.max(0, ent.maxDownloads - ent.downloadCount);
  return (
    <div>
      <p className="text-sm text-fg-subtle">
        Order <span className="font-mono text-fg-muted">{order?.publicId}</span>
      </p>
      <h1 className="display-md mt-3 text-fg">{order?.productName ?? "Your files"}</h1>
      <p className="mt-3 leading-relaxed text-fg-muted">ZIP mein sabhi 4 PDFs hain. Chahein toh har PDF alag se bhi download kar sakte hain.</p>
      <div className="mt-10">
        <FileList files={files} />
      </div>
      <Notice className="mt-8">
        Link valid till {ent.tokenExpiresAt.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} · {remaining} downloads
        remaining. File links 10 minute ke liye valid hote hain — expire ho jaye toh yeh page refresh kariye. Kripya yeh link share mat kariye.
      </Notice>
    </div>
  );
}
