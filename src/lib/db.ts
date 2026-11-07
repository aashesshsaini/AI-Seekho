import "server-only";
import mongoose from "mongoose";
import { env } from "./env";

/**
 * Serverless-safe Mongoose connection. The connection promise is cached on
 * globalThis so warm function invocations (and dev hot reloads) reuse it.
 */
type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };

const g = globalThis as unknown as { __aisMongoose?: Cache };
const cache: Cache = g.__aisMongoose ?? (g.__aisMongoose = { conn: null, promise: null });

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super("MONGODB_URI is not configured");
    this.name = "DatabaseNotConfiguredError";
  }
}

/**
 * Converts any driver/Mongoose error into a plain Error (name + message only).
 * Mongoose errors carry class instances (e.g. TopologyDescription) that cannot
 * cross Next.js cache/server→client boundaries ("Only plain objects…"), and their
 * messages can include connection details. Never leak either.
 */
export function toPlainDbError(err: unknown): Error {
  const raw = err instanceof Error ? err : new Error(String(err));
  const name = raw.name || "Error";
  const message = (raw.message || "Database error").replace(/mongodb(\+srv)?:\/\/[^\s"']+/g, "mongodb://***").slice(0, 200);
  const plain = new Error(`Database unavailable (${name}): ${message}`);
  plain.name = "DatabaseError";
  return plain;
}

/** Runs a DB read and guarantees any failure surfaces as a plain, safe Error. */
export async function dbRead<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof Error && err.name === "DatabaseError") throw err;
    throw toPlainDbError(err);
  }
}

export async function connectDb(): Promise<typeof mongoose> {
  if (cache.conn && mongoose.connection.readyState === 1) return cache.conn;
  const uri = env.mongoUri;
  if (!uri) throw new DatabaseNotConfiguredError();
  if (!cache.promise) {
    mongoose.set("strictQuery", true);
    cache.promise = mongoose
      .connect(uri, {
        dbName: env.mongoDbName,
        maxPoolSize: 5,
        minPoolSize: 0,
        serverSelectionTimeoutMS: 8000,
        socketTimeoutMS: 30000,
        bufferCommands: false,
      })
      .catch((err) => {
        cache.promise = null;
        throw toPlainDbError(err);
      });
  }
  cache.conn = await cache.promise;
  return cache.conn;
}
