import { describe, expect, it } from "vitest";
import { setupTestDb } from "../helpers/db";
import { AdminSession, AdminUser } from "@/lib/models/system";
import { hashPassword, validatePasswordStrength, verifyPassword } from "@/lib/auth/password";
import { authenticate, resolveSessionToken, roleAllows } from "@/lib/auth/session";
import { sha256Hex } from "@/lib/crypto";

setupTestDb();

const PW = "correct-horse-42-battery";

async function makeAdmin(role: "owner" | "editor" = "owner", extra: Record<string, unknown> = {}) {
  return AdminUser.create({ email: `${role}@aiseekho.test`, name: role, role, passwordHash: await hashPassword(PW), ...extra });
}

describe("password hashing", () => {
  it("hashes with scrypt and verifies", async () => {
    const h = await hashPassword(PW);
    expect(h.startsWith("scrypt$")).toBe(true);
    expect(h).not.toContain(PW);
    expect(await verifyPassword(PW, h)).toBe(true);
    expect(await verifyPassword(PW + "x", h)).toBe(false);
  });
  it("enforces a minimum strength (no weak default passwords)", () => {
    expect(validatePasswordStrength("short1")).toBeTruthy();
    expect(validatePasswordStrength("onlyletterslong")).toBeTruthy();
    expect(validatePasswordStrength(PW)).toBeNull();
  });
});

describe("admin authentication", () => {
  it("creates a DB session for valid credentials; only the token hash is stored", async () => {
    await makeAdmin();
    const r = await authenticate("OWNER@aiseekho.test", PW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const s = await AdminSession.findOne().lean();
    expect(s?.tokenHash).toBe(sha256Hex(r.token));
    expect(await resolveSessionToken(r.token)).toMatchObject({ email: "owner@aiseekho.test", role: "owner" });
  });

  it("rejects wrong passwords and unknown users with the same result", async () => {
    await makeAdmin();
    expect(await authenticate("owner@aiseekho.test", "wrong-password-1")).toEqual({ ok: false, reason: "invalid" });
    expect(await authenticate("nobody@aiseekho.test", PW)).toEqual({ ok: false, reason: "invalid" });
  });

  it("locks the account after repeated failures", async () => {
    await makeAdmin();
    for (let i = 0; i < 8; i++) await authenticate("owner@aiseekho.test", "wrong-password-1");
    expect(await authenticate("owner@aiseekho.test", PW)).toEqual({ ok: false, reason: "locked" });
  });

  it("rejects deactivated users and revokes their sessions", async () => {
    const u = await makeAdmin();
    const r = await authenticate("owner@aiseekho.test", PW);
    await AdminUser.updateOne({ _id: u._id }, { active: false });
    expect(r.ok && (await resolveSessionToken(r.token))).toBeNull();
    expect(await authenticate("owner@aiseekho.test", PW)).toEqual({ ok: false, reason: "invalid" });
  });

  it("rejects expired, forged or missing session tokens", async () => {
    await makeAdmin();
    const r = await authenticate("owner@aiseekho.test", PW);
    if (!r.ok) throw new Error("login failed");
    expect(await resolveSessionToken(undefined)).toBeNull();
    expect(await resolveSessionToken("A".repeat(43))).toBeNull();
    await AdminSession.updateOne({}, { expiresAt: new Date(Date.now() - 1000) });
    expect(await resolveSessionToken(r.token)).toBeNull();
  });
});

describe("admin authorization (roles)", () => {
  it("owner can do everything; editor only editor-level actions", () => {
    expect(roleAllows("owner", "owner")).toBe(true);
    expect(roleAllows("owner", "editor")).toBe(true);
    expect(roleAllows("editor", "editor")).toBe(true);
    expect(roleAllows("editor", "owner")).toBe(false);
  });
});
