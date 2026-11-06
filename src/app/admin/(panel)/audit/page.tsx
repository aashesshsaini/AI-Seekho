import { requireAdmin } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { AuditLog } from "@/lib/models/system";
import { PageTitle, Table, Td } from "@/components/admin/ui";

export const metadata = { title: "Audit log" };

export default async function AuditPage() {
  await requireAdmin("owner");
  await connectDb();
  const rows = await AuditLog.find().sort({ createdAt: -1 }).limit(200).lean();
  return (
    <div>
      <PageTitle title="Audit log">Latest 200 admin actions.</PageTitle>
      <Table head={["At", "Actor", "Action", "Target", "Details"]}>
        {rows.map((r) => (
          <tr key={String(r._id)}>
            <Td>{r.createdAt.toLocaleString("en-IN")}</Td>
            <Td>{r.actorEmail}</Td>
            <Td className="text-fg">{r.action}</Td>
            <Td className="font-mono text-xs">{r.target}</Td>
            <Td className="font-mono text-[11px]">{JSON.stringify(r.meta ?? {})}</Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
