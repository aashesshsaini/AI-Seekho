/**
 * Idempotent, non-destructive seed (see src/lib/content/run-seed.ts).
 * Usage: npm run db:seed (local) · npm run staging:seed (reads .env.staging.local)
 */
import mongoose from "mongoose";
import { runSeed } from "../src/lib/content/run-seed";

function describeTarget(uri: string, db: string) {
  const host = uri.replace(/^mongodb(\+srv)?:\/\//, "").split(/[/?]/)[0].split("@").pop() ?? "?";
  return `${host} / database "${db}"`;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  const db = process.env.MONGODB_DB ?? "aiseekho";
  console.log(`Seeding ${describeTarget(uri, db)} (insert-only; nothing is deleted or overwritten)`);
  await mongoose.connect(uri, { dbName: db, serverSelectionTimeoutMS: 15_000 });
  const r = await runSeed({ syncIndexes: true });
  console.log(`product: ${r.product.slug} — ${r.product.created ? "CREATED" : "already existed (left unchanged)"} · price ₹${r.product.pricePaise / 100} · active=${r.product.active}`);
  console.log(`assets metadata: ${r.assetsSynced} synced · tools +${r.toolsInserted} · tutorials +${r.tutorialsInserted} · services +${r.servicesInserted} · settings ${r.settingsCreated ? "created" : "kept"}`);
  if (!r.product.active) console.log("⚠ Product exists but is INACTIVE — activate it in Admin → Products (the page shows 'not available').");
  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error(e instanceof Error ? e.message.replace(/mongodb(\+srv)?:\/\/[^\s]+/g, "mongodb://***") : e);
  await mongoose.disconnect();
  process.exit(1);
});
