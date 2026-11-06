import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { PRICING_CLASSES, TOOL_CATEGORIES, Tool } from "@/lib/models/content";
import { isObjectId } from "@/lib/payments/service";
import { PRICING_LABEL } from "@/lib/labels";
import { AField, Flash, PageTitle, SaveBar, adminInput } from "@/components/admin/ui";
import { saveToolAction } from "../../../../actions";

export const metadata = { title: "Edit tool" };

function ymd(d?: Date | null) {
  if (!d) return "";
  const x = new Date(d.getTime() + 5.5 * 3600_000);
  return x.toISOString().slice(0, 10);
}

export default async function EditTool({ params, searchParams }: PageProps<"/admin/content/tools/[id]">) {
  await requireAdmin("editor");
  const { id } = await params;
  const isNew = id === "new";
  if (!isNew && !isObjectId(id)) notFound();
  await connectDb();
  const t = isNew ? null : await Tool.findById(id).lean();
  if (!isNew && !t) notFound();
  return (
    <div className="max-w-4xl">
      <Link href="/admin/content/tools" className="text-sm text-fg-muted hover:text-fg">← AI Tools</Link>
      <PageTitle title={isNew ? "New tool" : t!.name} />
      <Flash params={await searchParams} />
      <form action={saveToolAction} className="space-y-5">
        <input type="hidden" name="id" value={isNew ? "" : id} />
        <div className="grid gap-5 md:grid-cols-3">
          <AField label="Name" name="name"><input id="name" name="name" defaultValue={t?.name ?? ""} className={adminInput} required /></AField>
          <AField label="Slug" name="slug"><input id="slug" name="slug" defaultValue={t?.slug ?? ""} className={`${adminInput} font-mono`} required /></AField>
          <AField label="Official website (https)" name="website"><input id="website" name="website" type="url" defaultValue={t?.website ?? ""} className={adminInput} required /></AField>
        </div>
        <AField label="Description" name="description"><textarea id="description" name="description" rows={2} defaultValue={t?.description ?? ""} className={adminInput} /></AField>
        <div className="grid gap-5 md:grid-cols-3">
          <AField label="Category" name="category">
            <select id="category" name="category" defaultValue={t?.category ?? "chatbots"} className={adminInput}>
              {TOOL_CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}
            </select>
          </AField>
          <AField label="Pricing classification" name="pricingClass">
            <select id="pricingClass" name="pricingClass" defaultValue={t?.pricingClass ?? "unverified"} className={adminInput}>
              {PRICING_CLASSES.map((c) => <option key={c} value={c}>{PRICING_LABEL[c]}</option>)}
            </select>
          </AField>
          <AField label="Status" name="status">
            <select id="status" name="status" defaultValue={t?.status ?? "draft"} className={adminInput}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </AField>
        </div>
        <AField label="Pricing note (as stated on official page)" name="pricingNote"><textarea id="pricingNote" name="pricingNote" rows={2} defaultValue={t?.pricingNote ?? ""} className={adminInput} /></AField>
        <div className="grid gap-5 md:grid-cols-2">
          <AField label="Best use cases (one per line)" name="useCases"><textarea id="useCases" name="useCases" rows={4} defaultValue={(t?.useCases ?? []).join("\n")} className={adminInput} /></AField>
          <AField label="Limitations (one per line)" name="limitations"><textarea id="limitations" name="limitations" rows={4} defaultValue={(t?.limitations ?? []).join("\n")} className={adminInput} /></AField>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          <AField label="Verification status" name="verificationStatus">
            <select id="verificationStatus" name="verificationStatus" defaultValue={t?.verification?.status ?? "unverified"} className={adminInput}>
              <option value="verified">Verified</option>
              <option value="partly-verified">Partly verified</option>
              <option value="unverified">Unverified</option>
            </select>
          </AField>
          <AField label="Last verified (IST date)" name="lastVerifiedAt"><input id="lastVerifiedAt" name="lastVerifiedAt" type="date" defaultValue={ymd(t?.verification?.lastVerifiedAt)} className={adminInput} /></AField>
          <AField label="Official source URL" name="sourceUrl"><input id="sourceUrl" name="sourceUrl" type="url" defaultValue={t?.verification?.sourceUrl ?? ""} className={adminInput} /></AField>
        </div>
        <SaveBar />
      </form>
    </div>
  );
}
