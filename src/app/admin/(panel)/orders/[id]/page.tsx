import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { DownloadAudit, Entitlement, Order, PaymentEvent, type OrderDoc } from "@/lib/models/commerce";
import { downloadPageUrl, revealToken } from "@/lib/entitlements";
import { isObjectId } from "@/lib/payments/service";
import { getEmailSender } from "@/lib/email";
import { Flash, PageTitle, StatusPill, Table, Td } from "@/components/admin/ui";
import { regenerateLinkAction, resendEmailAction } from "../../../actions";

export const metadata = { title: "Order" };

export default async function OrderDetail({ params, searchParams }: PageProps<"/admin/orders/[id]">) {
  await requireAdmin("owner");
  const { id } = await params;
  const sp = await searchParams;
  if (!isObjectId(id)) notFound();
  await connectDb();
  const order = await Order.findById(id).lean<OrderDoc>();
  if (!order) notFound();
  const [ent, events] = await Promise.all([
    Entitlement.findOne({ orderId: order._id }).lean(),
    PaymentEvent.find({ $or: [{ orderId: order._id }, ...(order.razorpayOrderId ? [{ razorpayOrderId: order.razorpayOrderId }] : [])] }).sort({ createdAt: 1 }).lean(),
  ]);
  const downloads = ent ? await DownloadAudit.find({ entitlementId: ent._id }).sort({ createdAt: -1 }).limit(30).lean() : [];
  // Link is only revealed right after an explicit owner action (audited).
  const link = sp.reveal === "1" && ent ? revealToken(ent) : null;
  const emailOk = getEmailSender().configured;

  return (
    <div>
      <Link href="/admin/orders" className="text-sm text-fg-muted hover:text-fg">← Orders</Link>
      <PageTitle title={order.publicId}>{order.productName} · {formatINR(order.amountPaise)} · {order.mode} mode</PageTitle>
      <Flash params={sp} />
      {sp.emailed && sp.emailed !== "sent" && sp.reveal === "1" && (
        <p className="mb-4 text-sm text-warning">Email nahi bheja gaya ({String(sp.emailed)}). Neeche diya link customer ke verified email par manually bhejiye.</p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="surface space-y-2 p-5 text-sm">
          <p><span className="text-fg-subtle">Status:</span> <StatusPill status={order.status} /></p>
          <p><span className="text-fg-subtle">Customer:</span> <span className="text-fg">{order.customerName}</span> · {order.customerEmail}</p>
          <p><span className="text-fg-subtle">Razorpay order:</span> <span className="font-mono">{order.razorpayOrderId ?? "—"}</span></p>
          <p><span className="text-fg-subtle">Razorpay payment:</span> <span className="font-mono">{order.razorpayPaymentId ?? "—"}</span> {order.paymentMethod && `(${order.paymentMethod})`}</p>
          <p><span className="text-fg-subtle">Paid at:</span> {order.paidAt ? order.paidAt.toLocaleString("en-IN") : "—"}</p>
          {order.failureReason && <p><span className="text-fg-subtle">Failure:</span> {order.failureReason}</p>}
          {order.reviewReason && <p className="text-warning">Review: {order.reviewReason}</p>}
          <p><span className="text-fg-subtle">Email delivery:</span> {order.delivery?.emailStatus} {order.delivery?.emailError}</p>
        </div>
        <div className="surface space-y-3 p-5 text-sm">
          <p className="font-semibold text-fg">Delivery / entitlement</p>
          {ent ? (
            <>
              <p>Downloads used: {ent.downloadCount} / {ent.maxDownloads} · Link valid till {ent.tokenExpiresAt.toLocaleDateString("en-IN")} {ent.revoked && <span className="text-danger">· revoked ({ent.revokedReason})</span>}</p>
              {order.status === "paid" && !ent.revoked && (
                <div className="flex flex-wrap gap-3 pt-2">
                  <form action={regenerateLinkAction} className="flex items-center gap-3">
                    <input type="hidden" name="id" value={id} />
                    {emailOk && (
                      <label className="flex items-center gap-1.5 text-xs text-fg-muted"><input type="checkbox" name="sendEmail" defaultChecked /> email customer</label>
                    )}
                    <button className="rounded-lg bg-cyan-400 px-3 py-2 text-xs font-semibold text-ink-950">Regenerate link</button>
                  </form>
                  {emailOk && (
                    <form action={resendEmailAction}>
                      <input type="hidden" name="id" value={id} />
                      <button className="rounded-lg border border-line-strong px-3 py-2 text-xs text-fg">Resend current link</button>
                    </form>
                  )}
                </div>
              )}
              {link && (
                <div className="rounded-lg border border-cyan-400/30 bg-cyan-400/5 p-3">
                  <p className="text-xs text-fg-subtle">New personal link (purana link ab kaam nahi karega). Sirf customer ke verified email par share kariye:</p>
                  <p className="mt-1 break-all font-mono text-xs text-fg">{downloadPageUrl(link)}</p>
                </div>
              )}
            </>
          ) : (
            <p className="text-fg-muted">No entitlement (order not paid).</p>
          )}
        </div>
      </div>

      <h2 className="mb-3 mt-10 font-semibold text-fg">Status history</h2>
      <Table head={["At", "From", "To", "Source", "Note"]}>
        {order.statusHistory.map((h, i) => (
          <tr key={i}>
            <Td>{new Date(h.at).toLocaleString("en-IN")}</Td>
            <Td>{h.from ?? "—"}</Td>
            <Td><StatusPill status={h.to} /></Td>
            <Td>{h.source}</Td>
            <Td>{h.note}</Td>
          </tr>
        ))}
      </Table>

      <h2 className="mb-3 mt-10 font-semibold text-fg">Payment events</h2>
      <Table head={["Received", "Source", "Type", "Payment", "Amount", "Outcome"]}>
        {events.map((e) => (
          <tr key={String(e._id)}>
            <Td>{(e as unknown as { createdAt: Date }).createdAt.toLocaleString("en-IN")}</Td>
            <Td>{e.source}</Td>
            <Td>{e.type}</Td>
            <Td className="font-mono text-xs">{e.razorpayPaymentId ?? "—"}</Td>
            <Td>{typeof e.amountPaise === "number" ? formatINR(e.amountPaise) : "—"}</Td>
            <Td>{e.outcome}</Td>
          </tr>
        ))}
      </Table>

      <h2 className="mb-3 mt-10 font-semibold text-fg">Download audit</h2>
      <Table head={["At", "Outcome"]}>
        {downloads.map((d) => (
          <tr key={String(d._id)}>
            <Td>{(d as unknown as { createdAt: Date }).createdAt.toLocaleString("en-IN")}</Td>
            <Td>{d.outcome}</Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
