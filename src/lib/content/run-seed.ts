import type mongoose from "mongoose";
import { Product, ProductAsset } from "../models/commerce";
import * as commerce from "../models/commerce";
import * as content from "../models/content";
import * as system from "../models/system";
import { Service, Tool, Tutorial } from "../models/content";
import { SiteSettings } from "../models/system";
import { seedAssets, seedLegal, seedProduct, seedServices, seedSettings, seedTools, seedTutorials } from "./seed";

export type SeedReport = {
  product: { slug: string; created: boolean; pricePaise: number; active: boolean };
  assetsSynced: number;
  toolsInserted: number;
  tutorialsInserted: number;
  servicesInserted: number;
  settingsCreated: boolean;
};

/**
 * Idempotent, non-destructive seed. Safe on a production database:
 *  - NEVER deletes anything; never touches orders, customers, entitlements, payments or admins
 *  - product: insert-only ($setOnInsert) — an existing price, active flag or edited text is preserved
 *  - product assets: metadata (filename/size/SHA-256) kept in sync with the approved v4 package
 *  - tools / tutorials / services / settings: inserted only if missing
 * Assumes mongoose is already connected.
 */
export async function runSeed(opts: { syncIndexes?: boolean } = {}): Promise<SeedReport> {
  if (opts.syncIndexes) {
    for (const m of [...Object.values(commerce), ...Object.values(content), ...Object.values(system)]) {
      if (typeof m === "function" && "syncIndexes" in m) await (m as typeof mongoose.Model).createIndexes();
    }
  }

  const existed = await Product.exists({ slug: seedProduct.slug });
  const product = (await Product.findOneAndUpdate(
    { slug: seedProduct.slug },
    { $setOnInsert: { ...seedProduct } },
    { upsert: true, returnDocument: "after", runValidators: true },
  ))!;

  for (const a of seedAssets) {
    await ProductAsset.updateOne({ storageKey: a.storageKey }, { $set: { ...a, productId: product._id, active: true } }, { upsert: true });
  }

  let toolsInserted = 0;
  for (const t of seedTools) toolsInserted += (await Tool.updateOne({ slug: t.slug }, { $setOnInsert: t }, { upsert: true })).upsertedCount;
  let tutorialsInserted = 0;
  for (const t of seedTutorials) {
    const doc = { ...t, ...(t.status === "published" ? { publishedAt: new Date("2026-11-06T00:00:00+05:30") } : {}) };
    tutorialsInserted += (await Tutorial.updateOne({ slug: t.slug }, { $setOnInsert: doc }, { upsert: true })).upsertedCount;
  }
  let servicesInserted = 0;
  for (const s of seedServices) servicesInserted += (await Service.updateOne({ slug: s.slug }, { $setOnInsert: { ...s, status: "published" } }, { upsert: true })).upsertedCount;

  const settings = await SiteSettings.updateOne(
    { key: "site" },
    { $setOnInsert: { ...seedSettings, legalPages: Object.entries(seedLegal).map(([slug, body]) => ({ slug, body, approved: false })) } },
    { upsert: true },
  );

  return {
    product: { slug: product.slug, created: !existed, pricePaise: product.pricePaise, active: Boolean(product.active) },
    assetsSynced: seedAssets.length,
    toolsInserted,
    tutorialsInserted,
    servicesInserted,
    settingsCreated: settings.upsertedCount > 0,
  };
}
