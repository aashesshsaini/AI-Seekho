import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { Tutorial } from "@/lib/models/content";
import { Flash, PageTitle, StatusPill, Table, Td } from "@/components/admin/ui";

export const metadata = { title: "Tutorials" };

export default async function TutorialsAdmin({ searchParams }: PageProps<"/admin/content/tutorials">) {
  await requireAdmin("editor");
  await connectDb();
  const rows = await Tutorial.find().sort({ updatedAt: -1 }).lean();
  return (
    <div>
      <PageTitle title="Tutorials" action={<Link href="/admin/content/tutorials/new" className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-ink-950">New tutorial</Link>}>
        Draft tutorials public site par nahi dikhte.
      </PageTitle>
      <Flash params={await searchParams} />
      <Table head={["Title", "Category", "Status", "Updated"]}>
        {rows.map((t) => (
          <tr key={String(t._id)}>
            <Td><Link className="text-cyan-400 hover:underline" href={`/admin/content/tutorials/${t._id}`}>{t.title}</Link></Td>
            <Td>{t.category}</Td>
            <Td><StatusPill status={t.status} /></Td>
            <Td>{t.updatedAt.toLocaleDateString("en-IN")}</Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
