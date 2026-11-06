import { describe, expect, it } from "vitest";
import { setupTestDb } from "../helpers/db";
import { Enquiry } from "@/lib/models/content";
import { submitEnquiry } from "@/lib/enquiry";
import { rateLimit } from "@/lib/ratelimit";

setupTestDb();

const valid = { kind: "contact", name: "Meera", email: "meera@example.com", message: "Mujhe bulk purchase ke baare mein jaanna hai.", elapsedMs: 8000 };

describe("contact / enquiry form", () => {
  it("stores a valid enquiry", async () => {
    expect((await submitEnquiry(valid, "ip")).status).toBe(200);
    expect(await Enquiry.countDocuments()).toBe(1);
  });

  it("validates input", async () => {
    for (const bad of [{ ...valid, email: "x" }, { ...valid, name: "" }, { ...valid, message: "short" }, { ...valid, kind: "admin" }, { ...valid, phone: "abc" }, { ...valid, message: "x".repeat(5000) }]) {
      expect((await submitEnquiry(bad, "ip")).status).toBe(400);
    }
    expect((await submitEnquiry(null, "ip")).status).toBe(400);
    expect(await Enquiry.countDocuments()).toBe(0);
  });

  it("silently drops honeypot, too-fast and link-stuffed submissions", async () => {
    expect((await submitEnquiry({ ...valid, website: "http://spam" }, "ip")).status).toBe(200);
    expect((await submitEnquiry({ ...valid, elapsedMs: 300 }, "ip")).status).toBe(200);
    expect((await submitEnquiry({ ...valid, message: "buy http://a http://b http://c http://d now" }, "ip")).status).toBe(200);
    expect(await Enquiry.countDocuments()).toBe(0);
  });
});

describe("rate limiting", () => {
  it("blocks after the limit within a window, per identifier", async () => {
    const results = [];
    for (let i = 0; i < 6; i++) results.push((await rateLimit("t", "ipA", 5, 3600)).ok);
    expect(results).toEqual([true, true, true, true, true, false]);
    expect((await rateLimit("t", "ipB", 5, 3600)).ok).toBe(true);
  });
  it("is safe under concurrent requests", async () => {
    const r = await Promise.all(Array.from({ length: 10 }, () => rateLimit("c", "ipC", 5, 3600)));
    expect(r.filter((x) => x.ok)).toHaveLength(5);
  });
});
