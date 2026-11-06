import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { paiseToRupeeString } from "@/lib/money";
import { Product, ProductAsset } from "@/lib/models/commerce";
import { isObjectId } from "@/lib/payments/service";
import { AField, Flash, PageTitle, SaveBar, Table, Td, adminInput } from "@/components/admin/ui";
import { updateProductAction } from "../../../actions";

export const metadata = { title: "Edit product" };

export default async function EditProduct({ params, searchParams }: PageProps<"/admin/products/[id]">) {
  await requireAdmin("owner");
  const { id } = await params;
  if (!isObjectId(id)) notFound();
  await connectDb();
  const p = await Product.findById(id).lean();
  if (!p) notFound();
  const assets = await ProductAsset.find({ productId: p._id }).sort({ sortOrder: 1 }).lean();
  return (
    <div className="max-w-3xl">
      <Link href="/admin/products" className="text-sm text-fg-muted hover:text-fg">← Products</Link>
      <PageTitle title={p.name}>Price aur content changes turant public page par dikhte hain. Checkout hamesha database price use karta hai.</PageTitle>
      <Flash params={await searchParams} />
      <form action={updateProductAction} className="space-y-5">
        <input type="hidden" name="id" value={id} />
        <AField label="Name" name="name"><input id="name" name="name" defaultValue={p.name} className={adminInput} required /></AField>
        <AField label="Subtitle" name="subtitle"><input id="subtitle" name="subtitle" defaultValue={p.subtitle ?? ""} className={adminInput} /></AField>
        <AField label="Short description" name="shortDescription"><textarea id="shortDescription" name="shortDescription" rows={4} defaultValue={p.shortDescription ?? ""} className={adminInput} /></AField>
        <div className="grid gap-5 md:grid-cols-2">
          <AField label="Price (₹, INR)" name="price" hint="Stored as integer paise. Example: 199 or 199.00">
            <input id="price" name="price" inputMode="decimal" defaultValue={paiseToRupeeString(p.pricePaise)} className={adminInput} required />
          </AField>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm text-fg"><input type="checkbox" name="active" defaultChecked={p.active} /> Active (available for purchase)</label>
          </div>
        </div>
        <AField label="Highlights (one per line)" name="highlights"><textarea id="highlights" name="highlights" rows={7} defaultValue={(p.highlights ?? []).join("\n")} className={adminInput} /></AField>
        <AField label="Preview images" name="previewImages" hint="One per line: /images/product/preview-x.webp | alt text. Only public preview images — never paid files.">
          <textarea id="previewImages" name="previewImages" rows={6} defaultValue={(p.previewImages ?? []).map((i) => `${i.src} | ${i.alt}`).join("\n")} className={`${adminInput} font-mono text-xs`} />
        </AField>
        <AField label="SEO title" name="seoTitle"><input id="seoTitle" name="seoTitle" maxLength={80} defaultValue={p.seoTitle ?? ""} className={adminInput} /></AField>
        <AField label="SEO description" name="seoDescription"><textarea id="seoDescription" name="seoDescription" maxLength={200} rows={2} defaultValue={p.seoDescription ?? ""} className={adminInput} /></AField>
        <SaveBar />
      </form>

      <h2 className="mb-3 mt-12 font-semibold text-fg">Private product files</h2>
      <p className="mb-4 text-sm text-fg-muted">Files private storage mein hain aur <code>npm run assets:upload</code> se checksum verify karke attach hoti hain.</p>
      <Table head={["Label", "File", "Size", "SHA-256"]}>
        {assets.map((a) => (
          <tr key={String(a._id)}>
            <Td>{a.label}</Td>
            <Td className="font-mono text-xs">{a.filename}</Td>
            <Td>{(a.sizeBytes / 1024 / 1024).toFixed(2)} MB</Td>
            <Td className="font-mono text-[11px]">{a.sha256.slice(0, 16)}…</Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
