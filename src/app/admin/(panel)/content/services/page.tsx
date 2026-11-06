import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { Service } from "@/lib/models/content";
import { Flash, PageTitle, StatusPill, Table, Td } from "@/components/admin/ui";

export const metadata = { title: "Services" };

export default async function ServicesAdmin({ searchParams }: PageProps<"/admin/content/services">) {
  await requireAdmin("editor");
  await connectDb();
  const rows = await Service.find().sort({ sortOrder: 1 }).lean();
  return (
    <div>
      <PageTitle title="Service listings" action={<Link href="/admin/content/services/new" className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-ink-950">New service</Link>} />
      <Flash params={await searchParams} />
      <Table head={["Title", "Order", "Status"]}>
        {rows.map((s) => (
          <tr key={String(s._id)}>
            <Td><Link className="text-cyan-400 hover:underline" href={`/admin/content/services/${s._id}`}>{s.title}</Link></Td>
            <Td>{s.sortOrder}</Td>
            <Td><StatusPill status={s.status} /></Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
