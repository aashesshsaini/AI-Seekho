import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { Product, ProductAsset } from "@/lib/models/commerce";
import { PageTitle, StatusPill, Table, Td } from "@/components/admin/ui";

export const metadata = { title: "Products" };

export default async function ProductsPage() {
  await requireAdmin("owner");
  await connectDb();
  const products = await Product.find().sort({ createdAt: 1 }).lean();
  const assetCounts = await ProductAsset.aggregate<{ _id: unknown; n: number }>([{ $match: { active: true } }, { $group: { _id: "$productId", n: { $sum: 1 } } }]);
  const count = (id: unknown) => assetCounts.find((a) => String(a._id) === String(id))?.n ?? 0;
  return (
    <div>
      <PageTitle title="Products">Naya product seed script ya database se add hota hai; yahan existing products edit kariye.</PageTitle>
      <Table head={["Product", "Slug", "Price", "Status", "Private files"]}>
        {products.map((p) => (
          <tr key={String(p._id)}>
            <Td><Link className="text-cyan-400 hover:underline" href={`/admin/products/${p._id}`}>{p.name}</Link></Td>
            <Td className="font-mono text-xs">{p.slug}</Td>
            <Td>{formatINR(p.pricePaise)}</Td>
            <Td><StatusPill status={p.active ? "published" : "draft"} /></Td>
            <Td>{count(p._id)}</Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
