import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { ORDER_STATUSES, Order, RecoveryRequest } from "@/lib/models/commerce";
import { Flash, PageTitle, StatusPill, Table, Td, adminInput } from "@/components/admin/ui";
import { resolveRecoveryAction } from "../../actions";

export const metadata = { title: "Orders" };

export default async function OrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  await requireAdmin("owner");
  const params = await searchParams;
  const status = typeof params.status === "string" && (ORDER_STATUSES as readonly string[]).includes(params.status) ? params.status : "";
  const mode = params.mode === "live" ? "live" : params.mode === "test" ? "test" : "";
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (mode) filter.mode = mode;
  if (q) {
    const esc = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [{ publicId: q.toUpperCase() }, { customerEmail: new RegExp(esc, "i") }, { razorpayPaymentId: q }, { razorpayOrderId: q }];
  }
  await connectDb();
  const [orders, recovery] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).limit(100).lean(),
    RecoveryRequest.find({ outcome: "pending_admin" }).sort({ createdAt: -1 }).limit(50).lean(),
  ]);

  return (
    <div>
      <PageTitle title="Orders">Latest 100 matching orders.</PageTitle>
      <Flash params={params} />
      <form className="mb-6 grid gap-3 md:grid-cols-[1fr_180px_140px_auto]" role="search">
        <label className="sr-only" htmlFor="q">Search</label>
        <input id="q" name="q" defaultValue={q} placeholder="Order ref, email, pay_… or order_…" className={adminInput} />
        <label className="sr-only" htmlFor="status">Status</label>
        <select id="status" name="status" defaultValue={status} className={adminInput}>
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <label className="sr-only" htmlFor="mode">Mode</label>
        <select id="mode" name="mode" defaultValue={mode} className={adminInput}>
          <option value="">Any mode</option>
          <option value="test">test</option>
          <option value="live">live</option>
        </select>
        <button className="rounded-lg border border-line-strong px-4 py-2 text-sm text-fg hover:bg-white/5">Filter</button>
      </form>
      <Table head={["Order", "Customer", "Amount", "Status", "Mode", "Payment", "Delivery", "Created"]}>
        {orders.map((o) => (
          <tr key={String(o._id)}>
            <Td><Link className="font-mono text-cyan-400 hover:underline" href={`/admin/orders/${o._id}`}>{o.publicId}</Link></Td>
            <Td>{o.customerEmail}</Td>
            <Td>{formatINR(o.amountPaise)}</Td>
            <Td><StatusPill status={o.status} /></Td>
            <Td>{o.mode}</Td>
            <Td className="font-mono text-xs">{o.razorpayPaymentId ?? "—"}</Td>
            <Td>{o.delivery?.emailStatus ?? "—"}</Td>
            <Td>{o.createdAt.toLocaleString("en-IN")}</Td>
          </tr>
        ))}
      </Table>

      <h2 id="recovery" className="mb-3 mt-12 font-semibold text-fg">Recovery requests waiting for admin</h2>
      <p className="mb-4 text-sm text-fg-muted">
        Email delivery configure na hone par matched recovery requests yahan aati hain. Order kholiye → &ldquo;Regenerate link&rdquo; → link customer ko
        verified email par bhejiye.
      </p>
      <Table head={["Requested", "Email", "Order ref", "Matched order", ""]}>
        {recovery.map((r) => (
          <tr key={String(r._id)}>
            <Td>{r.createdAt.toLocaleString("en-IN")}</Td>
            <Td>{r.email}</Td>
            <Td className="font-mono">{r.orderRef}</Td>
            <Td>{r.matchedOrderId ? <Link className="text-cyan-400 hover:underline" href={`/admin/orders/${r.matchedOrderId}`}>Open order</Link> : "—"}</Td>
            <Td>
              <form action={resolveRecoveryAction}>
                <input type="hidden" name="id" value={String(r._id)} />
                <button className="text-xs text-fg-muted underline hover:text-fg">Mark resolved</button>
              </form>
            </Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
