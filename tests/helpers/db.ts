import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { afterAll, beforeAll, beforeEach } from "vitest";

/** Spins up an in-memory MongoDB for a test file and wipes collections between tests. */
export function setupTestDb() {
  let server: MongoMemoryReplSet;
  beforeAll(async () => {
    server = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    process.env.MONGODB_URI = server.getUri();
    process.env.MONGODB_DB = "aiseekho_test";
    const { connectDb } = await import("@/lib/db");
    await connectDb();
    for (const name of mongoose.modelNames()) await mongoose.model(name).syncIndexes();
  });
  beforeEach(async () => {
    const collections = await mongoose.connection.db!.collections();
    await Promise.all(collections.map((c) => c.deleteMany({})));
  });
  afterAll(async () => {
    await mongoose.disconnect();
    await server?.stop();
  });
}
