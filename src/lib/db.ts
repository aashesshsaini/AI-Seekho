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
        throw err;
      });
  }
  cache.conn = await cache.promise;
  return cache.conn;
}
