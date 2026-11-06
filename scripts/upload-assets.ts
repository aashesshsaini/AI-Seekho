/**
 * Verifies the approved customer files (filename + SHA-256) and places them in
 * PRIVATE storage. Refuses to upload anything that does not match exactly.
 *
 * Usage:
 *   npm run assets:upload -- --dir ~/Downloads                # local driver → .private-assets/
 *   STORAGE_DRIVER=netlify-blobs NETLIFY_SITE_ID=… NETLIFY_AUTH_TOKEN=… npm run assets:upload -- --dir ~/Downloads
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, copyFile } from "node:fs/promises";
import path from "node:path";
import { seedAssets } from "../src/lib/content/seed";

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const dir = arg("dir");
  if (!dir) throw new Error("Usage: npm run assets:upload -- --dir <folder containing the approved files>");
  const driver = process.env.STORAGE_DRIVER === "netlify-blobs" ? "netlify-blobs" : "local";

  const verified: { key: string; file: string; buf: Buffer }[] = [];
  for (const a of seedAssets) {
    const file = path.join(dir, a.filename);
    const buf = await readFile(file).catch(() => {
      throw new Error(`Missing approved file: ${a.filename}`);
    });
    const sha = createHash("sha256").update(buf).digest("hex");
    if (sha !== a.sha256 || buf.length !== a.sizeBytes) {
      throw new Error(`Checksum/size mismatch for ${a.filename} — refusing to upload. Expected ${a.sha256}, got ${sha}`);
    }
    console.log(`verified  ${a.filename}  ${sha}`);
    verified.push({ key: a.storageKey, file, buf });
  }

  if (driver === "local") {
    const root = path.resolve(process.env.PRIVATE_ASSETS_DIR ?? ".private-assets");
    for (const v of verified) {
      const dest = path.join(root, v.key);
      await mkdir(path.dirname(dest), { recursive: true });
      await copyFile(v.file, dest);
      console.log(`stored    ${dest}`);
    }
  } else {
    const siteID = process.env.NETLIFY_SITE_ID;
    const token = process.env.NETLIFY_AUTH_TOKEN;
    if (!siteID || !token) throw new Error("NETLIFY_SITE_ID and NETLIFY_AUTH_TOKEN are required for netlify-blobs upload");
    const { getStore } = await import("@netlify/blobs");
    const { blobStoreOptions } = await import("../src/lib/storage/options");
    const store = getStore({ ...blobStoreOptions(process.env.BLOBS_STORE ?? "product-files", process.env.BLOBS_REGION), siteID, token });
    for (const v of verified) {
      await store.set(v.key, new Blob([new Uint8Array(v.buf)]), { metadata: { size: v.buf.length, sha256: createHash("sha256").update(v.buf).digest("hex") } });
      // Read back metadata to prove the object landed with the right size/checksum.
      const meta = await store.getMetadata(v.key);
      if (!meta || meta.metadata?.size !== v.buf.length) throw new Error(`Verification after upload failed for ${v.key}`);
      console.log(`uploaded  blobs:${v.key}  (verified metadata)`);
    }
  }
  console.log(`Done (${driver}). ${verified.length} files.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
