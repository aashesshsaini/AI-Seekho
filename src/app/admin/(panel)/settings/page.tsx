import { requireAdmin } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { LEGAL_PAGES, SiteSettings } from "@/lib/models/system";
import { seedLegal } from "@/lib/content/seed";
import { AField, Flash, PageTitle, SaveBar, adminInput } from "@/components/admin/ui";
import { saveSettingsAction } from "../../actions";

export const metadata = { title: "Settings" };

export default async function SettingsPage({ searchParams }: PageProps<"/admin/settings">) {
  await requireAdmin("owner");
  await connectDb();
  const s = await SiteSettings.findOne({ key: "site" }).lean();
  const legal = (slug: string) => s?.legalPages?.find((p) => p.slug === slug);
  return (
    <div className="max-w-4xl">
      <PageTitle title="Settings">Brand, support contact, SEO defaults aur legal pages.</PageTitle>
      <Flash params={await searchParams} />
      <form action={saveSettingsAction} className="space-y-10">
        <section className="space-y-5">
          <h2 className="font-semibold text-fg">Brand &amp; support</h2>
          <div className="grid gap-5 md:grid-cols-2">
            <AField label="Brand name" name="brandName"><input id="brandName" name="brandName" defaultValue={s?.brandName ?? "AI SEEKHO"} className={adminInput} /></AField>
            <AField label="Tagline" name="tagline"><input id="tagline" name="tagline" defaultValue={s?.tagline ?? ""} className={adminInput} /></AField>
            <AField label="Support email (public)" name="supportEmail"><input id="supportEmail" name="supportEmail" type="email" defaultValue={s?.supportEmail ?? ""} className={adminInput} /></AField>
            <AField label="Support hours / response time" name="supportHours"><input id="supportHours" name="supportHours" defaultValue={s?.supportHours ?? ""} className={adminInput} /></AField>
          </div>
          <AField label="Social links (Label | https://…)" name="socialLinks">
            <textarea id="socialLinks" name="socialLinks" rows={3} defaultValue={(s?.socialLinks ?? []).map((l) => `${l.label} | ${l.url}`).join("\n")} className={`${adminInput} font-mono text-xs`} />
          </AField>
        </section>
        <section className="space-y-5">
          <h2 className="font-semibold text-fg">Site metadata</h2>
          <AField label="Default SEO title" name="seoTitle"><input id="seoTitle" name="seoTitle" maxLength={80} defaultValue={s?.seoTitle ?? ""} className={adminInput} /></AField>
          <AField label="Default SEO description" name="seoDescription"><textarea id="seoDescription" name="seoDescription" maxLength={200} rows={2} defaultValue={s?.seoDescription ?? ""} className={adminInput} /></AField>
        </section>
        <section className="space-y-5">
          <h2 className="font-semibold text-fg">Business details</h2>
          <p className="text-sm text-fg-muted">Sirf wahi details bhariye jo aap publicly dikhana chahte hain / jo legally sahi hain.</p>
          <div className="grid gap-5 md:grid-cols-2">
            <AField label="Legal / business name" name="legalName"><input id="legalName" name="legalName" defaultValue={s?.business?.legalName ?? ""} className={adminInput} /></AField>
            <AField label="GSTIN (if registered)" name="gstin"><input id="gstin" name="gstin" defaultValue={s?.business?.gstin ?? ""} className={adminInput} /></AField>
          </div>
          <AField label="Address" name="address"><textarea id="address" name="address" rows={2} defaultValue={s?.business?.address ?? ""} className={adminInput} /></AField>
        </section>
        <section className="space-y-6">
          <h2 className="font-semibold text-fg">Legal pages</h2>
          <p className="text-sm text-fg-muted">Draft pages par &ldquo;Draft&rdquo; notice dikhta hai aur search engines index nahi karte. &ldquo;Approved&rdquo; tabhi tick kariye jab content final aur reviewed ho.</p>
          {LEGAL_PAGES.map((p) => {
            const cur = legal(p.slug);
            return (
              <div key={p.slug} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor={`legal_${p.slug}`} className="text-sm font-medium text-fg">{p.title}</label>
                  <label className="flex items-center gap-2 text-xs text-fg-muted"><input type="checkbox" name={`approved_${p.slug}`} defaultChecked={Boolean(cur?.approved)} /> Approved</label>
                </div>
                <textarea id={`legal_${p.slug}`} name={`legal_${p.slug}`} rows={10} defaultValue={cur?.body || seedLegal[p.slug] || ""} className={`${adminInput} font-mono text-xs leading-relaxed`} />
              </div>
            );
          })}
        </section>
        <SaveBar label="Save settings" />
      </form>
    </div>
  );
}
