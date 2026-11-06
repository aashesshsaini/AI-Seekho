import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { Tool } from "@/lib/models/content";
import { Flash, PageTitle, StatusPill, Table, Td } from "@/components/admin/ui";

export const metadata = { title: "AI Tools" };

export default async function ToolsAdmin({ searchParams }: PageProps<"/admin/content/tools">) {
  await requireAdmin("editor");
  await connectDb();
  const rows = await Tool.find().sort({ name: 1 }).lean();
  return (
    <div>
      <PageTitle title="AI Tools" action={<Link href="/admin/content/tools/new" className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-ink-950">New tool</Link>}>
        Pricing ya &ldquo;free&rdquo; claim sirf official source aur verification date ke saath.
      </PageTitle>
      <Flash params={await searchParams} />
      <Table head={["Tool", "Category", "Pricing", "Verification", "Last verified", "Status"]}>
        {rows.map((t) => (
          <tr key={String(t._id)}>
            <Td><Link className="text-cyan-400 hover:underline" href={`/admin/content/tools/${t._id}`}>{t.name}</Link></Td>
            <Td>{t.category}</Td>
            <Td>{t.pricingClass}</Td>
            <Td>{t.verification?.status}</Td>
            <Td>{t.verification?.lastVerifiedAt ? new Date(t.verification.lastVerifiedAt).toLocaleDateString("en-IN") : "—"}</Td>
            <Td><StatusPill status={t.status} /></Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
