import "server-only";
import path from "node:path";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { env } from "../env";
import { blobStoreOptions } from "./options";
import { isOnNetlify } from "../data/product";

export { blobStoreOptions };

/**
 * Private product storage. Files are never placed in /public; they are only
 * readable by server code and served through the signed download route.
 */
export interface PrivateStorage {
  readonly name: string;
  open(key: string): Promise<{ body: ReadableStream<Uint8Array>; size: number | null } | null>;
  /** Existence/size check without reading the object (used by admin health). */
  stat(key: string): Promise<{ size: number | null } | null>;
}

export function assertSafeKey(key: string): void {
  if (!/^[A-Za-z0-9._/-]+$/.test(key) || key.includes("..") || key.startsWith("/")) {
    throw new Error("Unsafe storage key");
  }
}

/** Development driver: reads from a private directory outside /public (gitignored). */
export function localStorageDriver(baseDir: string): PrivateStorage {
  const root = path.resolve(/* turbopackIgnore: true */ process.cwd(), baseDir);
  return {
    name: "local",
    async open(key) {
      assertSafeKey(key);
      const full = path.resolve(root, key);
      if (!full.startsWith(root + path.sep)) throw new Error("Unsafe storage key");
      try {
        const s = await stat(full);
        if (!s.isFile()) return null;
        const body = Readable.toWeb(createReadStream(full)) as ReadableStream<Uint8Array>;
        return { body, size: s.size };
      } catch {
        return null;
      }
    },
    async stat(key) {
      assertSafeKey(key);
      const full = path.resolve(root, key);
      if (!full.startsWith(root + path.sep)) throw new Error("Unsafe storage key");
      try {
        const s = await stat(full);
        return s.isFile() ? { size: s.size } : null;
      } catch {
        return null;
      }
    },
  };
}

/** Production driver: Netlify Blobs (site-wide store, private by default). */

export function netlifyBlobsDriver(storeName: string, region?: string): PrivateStorage {
  async function store() {
    const { getStore } = await import("@netlify/blobs");
    return getStore(blobStoreOptions(storeName, region));
  }
  return {
    name: "netlify-blobs",
    async stat(key) {
      assertSafeKey(key);
      const meta = await (await store()).getMetadata(key);
      if (!meta) return null;
      return { size: typeof meta.metadata?.size === "number" ? meta.metadata.size : null };
    },
    async open(key) {
      assertSafeKey(key);
      const s = await store();
      const meta = await s.getMetadata(key);
      if (!meta) return null;
      // Streamed straight through to the response — the file is never buffered in memory.
      const body = (await s.get(key, { type: "stream" })) as ReadableStream<Uint8Array> | null;
      if (!body) return null;
      const size = typeof meta.metadata?.size === "number" ? meta.metadata.size : null;
      return { body, size };
    },
  };
}

let override: PrivateStorage | null = null;
/** Test hook. */
export function setStorageForTests(s: PrivateStorage | null): void {
  override = s;
}

export { isOnNetlify };

export function getStorage(): PrivateStorage {
  if (override) return override;
  if (env.storageDriver === "netlify-blobs") return netlifyBlobsDriver(env.blobsStore, env.blobsRegion);
  // The local driver must never be used on Netlify (files would have to ship inside the deploy).
  if (isOnNetlify()) throw new Error("STORAGE_DRIVER must be 'netlify-blobs' on Netlify");
  return localStorageDriver(env.localAssetsDir);
}
