import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { TUTORIAL_CATEGORIES, Tutorial } from "@/lib/models/content";
import { isObjectId } from "@/lib/payments/service";
import { AField, Flash, PageTitle, SaveBar, adminInput } from "@/components/admin/ui";
import { saveTutorialAction } from "../../../../actions";

export const metadata = { title: "Edit tutorial" };

export default async function EditTutorial({ params, searchParams }: PageProps<"/admin/content/tutorials/[id]">) {
  await requireAdmin("editor");
  const { id } = await params;
  const isNew = id === "new";
  if (!isNew && !isObjectId(id)) notFound();
  await connectDb();
  const t = isNew ? null : await Tutorial.findById(id).lean();
  if (!isNew && !t) notFound();
  return (
    <div className="max-w-4xl">
      <Link href="/admin/content/tutorials" className="text-sm text-fg-muted hover:text-fg">← Tutorials</Link>
      <PageTitle title={isNew ? "New tutorial" : t!.title}>
        Body: simple markdown — ## heading, - list, 1. list, **bold**, `code`, [text](https://link). Sirf verified jaankari publish kariye.
      </PageTitle>
      <Flash params={await searchParams} />
      <form action={saveTutorialAction} className="space-y-5">
        <input type="hidden" name="id" value={isNew ? "" : id} />
        <div className="grid gap-5 md:grid-cols-2">
          <AField label="Title" name="title"><input id="title" name="title" defaultValue={t?.title ?? ""} className={adminInput} required /></AField>
          <AField label="Slug" name="slug"><input id="slug" name="slug" defaultValue={t?.slug ?? ""} className={`${adminInput} font-mono`} required /></AField>
        </div>
        <AField label="Excerpt" name="excerpt"><textarea id="excerpt" name="excerpt" rows={2} maxLength={300} defaultValue={t?.excerpt ?? ""} className={adminInput} /></AField>
        <div className="grid gap-5 md:grid-cols-4">
          <AField label="Category" name="category">
            <select id="category" name="category" defaultValue={t?.category ?? "ai-basics"} className={adminInput}>
              {TUTORIAL_CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}
            </select>
          </AField>
          <AField label="Level" name="level">
            <select id="level" name="level" defaultValue={t?.level ?? "beginner"} className={adminInput}>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
            </select>
          </AField>
          <AField label="Reading minutes" name="readingMinutes"><input id="readingMinutes" name="readingMinutes" type="number" min={1} max={60} defaultValue={t?.readingMinutes ?? 4} className={adminInput} /></AField>
          <AField label="Status" name="status">
            <select id="status" name="status" defaultValue={t?.status ?? "draft"} className={adminInput}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </AField>
        </div>
        <AField label="Body" name="body"><textarea id="body" name="body" rows={22} defaultValue={t?.body ?? ""} className={`${adminInput} font-mono text-xs leading-relaxed`} /></AField>
        <AField label="Sources (one per line: Label | https://…)" name="sources">
          <textarea id="sources" name="sources" rows={3} defaultValue={(t?.sources ?? []).map((s) => `${s.label} | ${s.url}`).join("\n")} className={`${adminInput} font-mono text-xs`} />
        </AField>
        <SaveBar />
      </form>
    </div>
  );
}
