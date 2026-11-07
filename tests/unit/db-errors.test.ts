import { describe, expect, it } from "vitest";
import { dbRead, toPlainDbError } from "@/lib/db";

class TopologyDescription {
  servers = new Map([["127.0.0.1:27027", {}]]);
}
function fakeServerSelectionError() {
  const e = new Error("connect ECONNREFUSED 127.0.0.1:27027 (mongodb+srv://admin:S3cretPass@cluster0.x.mongodb.net/db)") as Error & Record<string, unknown>;
  e.name = "MongooseServerSelectionError";
  e.reason = new TopologyDescription();
  e.errorLabelSet = new Set();
  return e;
}

describe("database errors are plain and safe", () => {
  it("strips class-instance properties so they can cross Next.js cache/client boundaries", () => {
    const plain = toPlainDbError(fakeServerSelectionError());
    expect(plain).toBeInstanceOf(Error);
    expect(plain.name).toBe("DatabaseError");
    // Only primitive own props remain (no reason / TopologyDescription / Set)
    expect(Object.values(plain).every((v) => typeof v === "string")).toBe(true);
    expect(Object.keys(plain)).not.toContain("reason");
    expect(() => structuredClone(plain)).not.toThrow();
    expect(plain.message).toContain("MongooseServerSelectionError");
    expect(plain.message).toContain("ECONNREFUSED");
  });

  it("never leaks connection strings or passwords", () => {
    const plain = toPlainDbError(fakeServerSelectionError());
    expect(plain.message).not.toContain("S3cretPass");
    expect(plain.message).not.toContain("admin:");
    expect(plain.message).toContain("mongodb://***");
  });

  it("dbRead converts failures and passes results through", async () => {
    await expect(dbRead(async () => 42)).resolves.toBe(42);
    const err = await dbRead(async () => {
      throw fakeServerSelectionError();
    }).catch((e) => e);
    expect(err.name).toBe("DatabaseError");
    expect(Object.keys(err)).not.toContain("reason");
    expect(Object.values(err).every((v) => typeof v === "string")).toBe(true);
  });
});
