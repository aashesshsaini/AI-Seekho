import "server-only";
import path from "node:path";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { env } from "../env";

/**
 * Private product storage. Files are never placed in /public; they are only
 * readable by server code and served through the signed download route.
 */
export interface PrivateStorage {
  readonly name: string;
  open(key: string): Promise<{ body: ReadableStream<Uint8Array>; size: number | null } | null>;
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
  };
}

/** Production driver: Netlify Blobs (site-wide store, private by default). */
export function netlifyBlobsDriver(storeName: string): PrivateStorage {
  return {
    name: "netlify-blobs",
    async open(key) {
      assertSafeKey(key);
      const { getStore } = await import("@netlify/blobs");
      const store = getStore({ name: storeName, consistency: "strong" });
      const meta = await store.getMetadata(key);
      if (!meta) return null;
      const body = (await store.get(key, { type: "stream" })) as ReadableStream<Uint8Array> | null;
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

export function getStorage(): PrivateStorage {
  if (override) return override;
  return env.storageDriver === "netlify-blobs" ? netlifyBlobsDriver(env.blobsStore) : localStorageDriver(env.localAssetsDir);
}
