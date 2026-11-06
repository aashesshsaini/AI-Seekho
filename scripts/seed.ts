/**
 * Seeds / syncs the database. Safe to run repeatedly:
 *  - never overwrites an existing product price, active flag or edited content
 *  - inserts missing tools/tutorials/services/settings
 *  - syncs product asset metadata (checksums) for the approved v4 package
 * Usage: npm run db:seed
 */
import mongoose from "mongoose";
import { Product, ProductAsset } from "../src/lib/models/commerce";
import { Service, Tool, Tutorial } from "../src/lib/models/content";
import { SiteSettings } from "../src/lib/models/system";
import * as models from "../src/lib/models/commerce";
import * as content from "../src/lib/models/content";
import * as system from "../src/lib/models/system";
import { seedAssets, seedLegal, seedProduct, seedServices, seedSettings, seedTools, seedTutorials } from "../src/lib/content/seed";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  await mongoose.connect(uri, { dbName: process.env.MONGODB_DB ?? "aiseekho" });

  for (const m of [...Object.values(models), ...Object.values(content), ...Object.values(system)]) {
    if (typeof m === "function" && "syncIndexes" in m) await (m as typeof mongoose.Model).syncIndexes();
  }

  const { pricePaise, active, ...rest } = seedProduct;
  const product = await Product.findOneAndUpdate(
    { slug: seedProduct.slug },
    { $setOnInsert: { ...rest, pricePaise, active } },
    { upsert: true, returnDocument: "after" },
  );
  console.log(`product: ${product.slug} (price ${product.pricePaise} paise, active ${product.active})`);

  for (const a of seedAssets) {
    await ProductAsset.updateOne({ storageKey: a.storageKey }, { $set: { ...a, productId: product._id, active: true } }, { upsert: true });
  }
  console.log(`assets: ${seedAssets.length} synced`);

  let n = 0;
  for (const t of seedTools) n += (await Tool.updateOne({ slug: t.slug }, { $setOnInsert: t }, { upsert: true })).upsertedCount;
  console.log(`tools: ${n} inserted`);
  n = 0;
  for (const t of seedTutorials)
    n += (await Tutorial.updateOne({ slug: t.slug }, { $setOnInsert: { ...t, ...(t.status === "published" ? { publishedAt: new Date("2026-11-06T00:00:00+05:30") } : {}) } }, { upsert: true })).upsertedCount;
  console.log(`tutorials: ${n} inserted`);
  n = 0;
  for (const s of seedServices) n += (await Service.updateOne({ slug: s.slug }, { $setOnInsert: { ...s, status: "published" } }, { upsert: true })).upsertedCount;
  console.log(`services: ${n} inserted`);

  await SiteSettings.updateOne(
    { key: "site" },
    { $setOnInsert: { ...seedSettings, legalPages: Object.entries(seedLegal).map(([slug, body]) => ({ slug, body, approved: false })) } },
    { upsert: true },
  );
  console.log("settings: ensured");
  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error(e instanceof Error ? e.message : e);
  await mongoose.disconnect();
  process.exit(1);
});
