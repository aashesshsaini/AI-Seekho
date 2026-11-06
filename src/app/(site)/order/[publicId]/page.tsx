import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { CHECKOUT_COOKIE, getOrderForBuyer } from "@/lib/payments/service";
import { Entitlement, Order } from "@/lib/models/commerce";
import { checkEntitlement, downloadPageUrl, listDownloadableFiles, revealToken } from "@/lib/entitlements";
import { formatINR } from "@/lib/money";
import { ButtonLink, Notice } from "@/components/ui";
import { FileList } from "@/components/checkout/file-list";
import { CopyLink, PendingPoller } from "@/components/checkout/order-client";
import { TrackOnMount } from "@/components/site/consent";

export const metadata: Metadata = { title: "Your order", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default function OrderPage({ params }: PageProps<"/order/[publicId]">) {
  return (
    <div className="container-page max-w-3xl py-14 md:py-20">
      <Suspense fallback={<p className="text-fg-muted">Order load ho raha hai…</p>}>
        <OrderView params={params} />
      </Suspense>
    </div>
  );
}

async function OrderView({ params }: { params: Promise<{ publicId: string }> }) {
  await connection();
  const { publicId } = await params;
  const order = /^AIS-[A-Z0-9]{5}-[A-Z0-9]{5}$/.test(publicId) ? await getOrderForBuyer(publicId, (await cookies()).get(CHECKOUT_COOKIE)?.value) : null;

  if (!order) {
    return (
      <div>
        <h1 className="display-md text-fg">Order is browser mein nahi mila</h1>
        <p className="mt-4 leading-relaxed text-fg-muted">
          Security ke liye order details sirf usi browser mein dikhti hain jisse purchase kiya gaya tha. Agar aapne payment kiya hai, toh
          recovery page par email aur order reference daaliye.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/recover">Download recover kariye</ButtonLink>
          <ButtonLink href="/contact" variant="secondary">Support</ButtonLink>
        </div>
      </div>
    );
  }

  const header = (
    <p className="text-sm text-fg-subtle">
      Order <span className="font-mono text-fg-muted">{order.publicId}</span> · {order.productName} · {formatINR(order.amountPaise)}
      {order.mode === "test" && <span className="ml-2 rounded bg-warning/15 px-1.5 py-0.5 text-xs text-warning">TEST MODE</span>}
    </p>
  );

  if (order.status === "paid") {
    const ent = await Entitlement.findOne({ orderId: order._id }).lean();
    const check = await checkEntitlement(ent);
    const files = check.ok ? await listDownloadableFiles(check.entitlement) : [];
    const token = check.ok ? revealToken(check.entitlement) : null;
    // Fire the purchase analytics event at most once per order (server-verified).
    const claim = await Order.findOneAndUpdate({ _id: order._id, purchaseTrackedAt: { $exists: false } }, { $set: { purchaseTrackedAt: new Date() } }).lean();
    return (
      <div>
        {claim && <TrackOnMount event="purchase" value={order.amountPaise / 100} currency="INR" transaction_id={order.publicId} item_id={order.productSlug} />}
        {header}
        <div className="mt-6 flex items-start gap-4">
          <CheckCircle2 className="mt-1 h-8 w-8 shrink-0 text-success" aria-hidden />
          <div>
            <h1 className="display-md text-fg">Payment verified. Shukriya!</h1>
            <p className="mt-3 leading-relaxed text-fg-muted">Aapki files ready hain. Neeche se ZIP (sabhi 4 PDFs) ya har PDF alag se download kariye.</p>
          </div>
        </div>
        <div className="mt-10">
          {check.ok ? <FileList files={files} /> : <Notice tone="warning">Download access abhi available nahi hai. Kripya support se contact kariye.</Notice>}
        </div>
        {token && (
          <div className="mt-10">
            <h2 className="font-semibold text-fg">Apna personal download link save kariye</h2>
            <p className="mt-1 mb-3 text-sm text-fg-muted">Is link se aap kisi bhi device par dobara download kar sakte hain. Ise share mat kariye.</p>
            <CopyLink url={downloadPageUrl(token)} />
          </div>
        )}
        <Notice className="mt-8">
          {order.delivery?.emailStatus === "sent"
            ? `Download link ${order.customerEmail} par bhi email kar diya gaya hai.`
            : "Email delivery abhi active nahi hai — kripya upar diya link save kar lijiye."}{" "}
          File links kuch minute mein expire hote hain; page refresh karke naye links mil jaate hain.
        </Notice>
      </div>
    );
  }

  if (order.status === "created" || order.status === "authorized") {
    return (
      <div>
        {header}
        <div className="mt-6 flex items-start gap-4">
          <Clock className="mt-1 h-8 w-8 shrink-0 text-warning" aria-hidden />
          <div>
            <h1 className="display-md text-fg">Payment confirm ho raha hai</h1>
            <p className="mt-3 leading-relaxed text-fg-muted">
              Hum Razorpay se payment verify kar rahe hain. Jab tak verification complete nahi hota, hum ise successful nahi maante. Yeh page
              apne aap update ho jayega.
            </p>
            <PendingPoller publicId={order.publicId} />
          </div>
        </div>
        <p className="mt-10 text-sm text-fg-subtle">
          Payment nahi kiya? <Link href="/products/ai-se-smart-kaam" className="text-cyan-400 underline">Product page par wapas jaiye</Link>.
        </p>
      </div>
    );
  }

  if (order.status === "failed") {
    return (
      <div>
        {header}
        <div className="mt-6 flex items-start gap-4">
          <XCircle className="mt-1 h-8 w-8 shrink-0 text-danger" aria-hidden />
          <div>
            <h1 className="display-md text-fg">Payment complete nahi hua</h1>
            <p className="mt-3 leading-relaxed text-fg-muted">
              Koi charge confirm nahi hua. Aap dobara try kar sakte hain. Agar aapke account se paisa kat gaya hai, toh aam taur par bank use
              apne aap wapas kar deta hai — phir bhi doubt ho toh order reference ke saath support se contact kariye.
            </p>
          </div>
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/products/ai-se-smart-kaam">Dobara try kariye</ButtonLink>
          <ButtonLink href="/contact" variant="secondary">Support</ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <div>
      {header}
      <div className="mt-6 flex items-start gap-4">
        <AlertTriangle className="mt-1 h-8 w-8 shrink-0 text-warning" aria-hidden />
        <div>
          <h1 className="display-md text-fg">{order.status === "refunded" ? "Yeh order refund ho chuka hai" : "Payment manual review mein hai"}</h1>
          <p className="mt-3 leading-relaxed text-fg-muted">
            {order.status === "refunded"
              ? "Refund ke baad is order ka download access band ho jaata hai."
              : "Payment details order se match nahi hui, isliye hum ise manually check kar rahe hain. Kripya order reference ke saath support se contact kariye."}
          </p>
        </div>
      </div>
      <ButtonLink href="/contact" variant="secondary" className="mt-8">Support</ButtonLink>
    </div>
  );
}
