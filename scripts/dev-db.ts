/**
 * Local MongoDB for development (no Atlas needed). Data persists in .data/mongo.
 * Usage: npm run dev:db   then set MONGODB_URI=mongodb://127.0.0.1:27027 in .env.local
 */
import { mkdirSync } from "node:fs";
import { MongoMemoryServer } from "mongodb-memory-server";

async function main() {
  mkdirSync(".data/mongo", { recursive: true });
  const server = await MongoMemoryServer.create({ instance: { port: 27027, dbPath: ".data/mongo", storageEngine: "wiredTiger" } });
  console.log(`Local MongoDB running at ${server.getUri()} (Ctrl+C to stop)`);
  const stop = async () => {
    await server.stop({ doCleanup: false });
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}
main();
