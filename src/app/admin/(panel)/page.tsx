import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { env, isRazorpayConfigured } from "@/lib/env";
import { formatINR } from "@/lib/money";
import { Order, RecoveryRequest } from "@/lib/models/commerce";
import { Enquiry } from "@/lib/models/content";
import { AuditLog } from "@/lib/models/system";
import { getEmailSender } from "@/lib/email";
import { Flash, PageTitle, StatusPill, Table, Td } from "@/components/admin/ui";

export const metadata = { title: "Dashboard" };

export default async function AdminDashboard({ searchParams }: PageProps<"/admin">) {
  const admin = await requireAdmin("editor");
  const params = await searchParams;
  await connectDb();
  const mode = env.razorpayMode;

  const [revenueAgg, counts, recent, newEnquiries, pendingRecovery, activity] = await Promise.all([
    Order.aggregate<{ _id: null; total: number; n: number }>([{ $match: { status: "paid", mode } }, { $group: { _id: null, total: { $sum: "$amountPaise" }, n: { $sum: 1 } } }]),
    Order.aggregate<{ _id: string; n: number }>([{ $match: { mode } }, { $group: { _id: "$status", n: { $sum: 1 } } }]),
    admin.role === "owner" ? Order.find({ mode }).sort({ createdAt: -1 }).limit(8).lean() : Promise.resolve([]),
    Enquiry.countDocuments({ status: "new" }),
    RecoveryRequest.countDocuments({ outcome: "pending_admin" }),
    admin.role === "owner" ? AuditLog.find().sort({ createdAt: -1 }).limit(8).lean() : Promise.resolve([]),
  ]);
  const by = Object.fromEntries(counts.map((c) => [c._id, c.n])) as Record<string, number>;
  const revenue = revenueAgg[0]?.total ?? 0;
  const paid = revenueAgg[0]?.n ?? 0;

  const health = [
    { label: "Razorpay", ok: isRazorpayConfigured(), detail: isRazorpayConfigured() ? `${mode.toUpperCase()} mode` : "Keys not set" },
    { label: "Webhook secret", ok: Boolean(env.razorpayWebhookSecret), detail: env.razorpayWebhookSecret ? "Configured" : "Not set" },
    { label: "Email delivery", ok: getEmailSender().configured, detail: getEmailSender().configured ? "Active" : "Not configured" },
    { label: "Private storage", ok: true, detail: env.storageDriver },
  ];

  return (
    <div>
      <PageTitle title={`Namaste, ${admin.name}`}>Showing {mode.toUpperCase()}-mode orders only.</PageTitle>
      <Flash params={params} />
      {admin.role === "owner" && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Verified revenue", formatINR(revenue)],
            ["Paid orders / products sold", String(paid)],
            ["Pending (created / authorized)", String((by.created ?? 0) + (by.authorized ?? 0))],
            ["Failed / review", `${by.failed ?? 0} / ${by.review ?? 0}`],
          ].map(([l, v]) => (
            <div key={l} className="surface p-5">
              <p className="text-xs uppercase tracking-wider text-fg-subtle">{l}</p>
              <p className="mt-2 text-2xl font-semibold text-fg">{v}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {health.map((h) => (
          <div key={h.label} className="rounded-xl border border-line px-4 py-3 text-sm">
            <span className={h.ok ? "text-success" : "text-warning"}>●</span> <span className="text-fg">{h.label}</span>
            <span className="block text-xs text-fg-subtle">{h.detail}</span>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-3 text-sm">
        <Link href="/admin/enquiries" className="rounded-lg border border-line-strong px-3 py-2 text-fg-muted hover:text-fg">{newEnquiries} new enquiries</Link>
        {admin.role === "owner" && (
          <Link href="/admin/orders#recovery" className="rounded-lg border border-line-strong px-3 py-2 text-fg-muted hover:text-fg">{pendingRecovery} recovery requests waiting</Link>
        )}
      </div>

      {admin.role === "owner" && (
        <>
          <h2 className="mb-3 mt-10 font-semibold text-fg">Recent orders</h2>
          <Table head={["Order", "Customer", "Amount", "Status", "Created"]}>
            {recent.map((o) => (
              <tr key={String(o._id)}>
                <Td><Link className="font-mono text-cyan-400 hover:underline" href={`/admin/orders/${o._id}`}>{o.publicId}</Link></Td>
                <Td>{o.customerEmail}</Td>
                <Td>{formatINR(o.amountPaise)}</Td>
                <Td><StatusPill status={o.status} /></Td>
                <Td>{o.createdAt.toLocaleString("en-IN")}</Td>
              </tr>
            ))}
          </Table>
          <h2 className="mb-3 mt-10 font-semibold text-fg">Recent admin activity</h2>
          <ul className="space-y-1.5 text-sm text-fg-muted">
            {activity.map((a) => (
              <li key={String(a._id)}>
                <span className="text-fg-subtle">{a.createdAt.toLocaleString("en-IN")}</span> · {a.actorEmail} · <span className="text-fg">{a.action}</span> {a.target}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
