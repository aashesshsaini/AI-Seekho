import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { Service } from "@/lib/models/content";
import { isObjectId } from "@/lib/payments/service";
import { AField, Flash, PageTitle, SaveBar, adminInput } from "@/components/admin/ui";
import { saveServiceAction } from "../../../../actions";

export const metadata = { title: "Edit service" };

export default async function EditService({ params, searchParams }: PageProps<"/admin/content/services/[id]">) {
  await requireAdmin("editor");
  const { id } = await params;
  const isNew = id === "new";
  if (!isNew && !isObjectId(id)) notFound();
  await connectDb();
  const s = isNew ? null : await Service.findById(id).lean();
  if (!isNew && !s) notFound();
  return (
    <div className="max-w-3xl">
      <Link href="/admin/content/services" className="text-sm text-fg-muted hover:text-fg">← Services</Link>
      <PageTitle title={isNew ? "New service" : s!.title}>Portfolio results ya testimonials sirf real, documented work ke saath add kariye.</PageTitle>
      <Flash params={await searchParams} />
      <form action={saveServiceAction} className="space-y-5">
        <input type="hidden" name="id" value={isNew ? "" : id} />
        <div className="grid gap-5 md:grid-cols-2">
          <AField label="Title" name="title"><input id="title" name="title" defaultValue={s?.title ?? ""} className={adminInput} required /></AField>
          <AField label="Slug" name="slug"><input id="slug" name="slug" defaultValue={s?.slug ?? ""} className={`${adminInput} font-mono`} required /></AField>
        </div>
        <AField label="Summary" name="summary"><textarea id="summary" name="summary" rows={3} defaultValue={s?.summary ?? ""} className={adminInput} /></AField>
        <AField label="Deliverables (one per line)" name="deliverables"><textarea id="deliverables" name="deliverables" rows={4} defaultValue={(s?.deliverables ?? []).join("\n")} className={adminInput} /></AField>
        <div className="grid gap-5 md:grid-cols-2">
          <AField label="Sort order" name="sortOrder"><input id="sortOrder" name="sortOrder" type="number" min={0} defaultValue={s?.sortOrder ?? 0} className={adminInput} /></AField>
          <AField label="Status" name="status">
            <select id="status" name="status" defaultValue={s?.status ?? "published"} className={adminInput}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </AField>
        </div>
        <SaveBar />
      </form>
    </div>
  );
}
