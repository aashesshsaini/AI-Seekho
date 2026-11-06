import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { connectDb } from "../db";
import { env } from "../env";
import { randomToken, sha256Hex } from "../crypto";
import { AdminSession, AdminUser, type AdminRole } from "../models/system";
import { DUMMY_HASH, verifyPassword } from "./password";

export const ADMIN_COOKIE = "ais_admin";
const SESSION_HOURS = 12;
const MAX_FAILED = 8;
const LOCK_MINUTES = 15;

export type AdminIdentity = { id: string; email: string; name: string; role: AdminRole };

export type LoginResult = { ok: true; token: string; expiresAt: Date } | { ok: false; reason: "invalid" | "locked" };

/** Pure credential check + session creation (no cookie I/O) — unit-testable. */
export async function authenticate(emailRaw: string, password: string): Promise<LoginResult> {
  await connectDb();
  const email = emailRaw.trim().toLowerCase();
  const user = await AdminUser.findOne({ email });
  if (!user || !user.active) {
    await verifyPassword(password, DUMMY_HASH); // equalise timing
    return { ok: false, reason: "invalid" };
  }
  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) return { ok: false, reason: "locked" };

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    const failed = (user.failedLogins ?? 0) + 1;
    await AdminUser.updateOne(
      { _id: user._id },
      failed >= MAX_FAILED
        ? { $set: { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) } }
        : { $set: { failedLogins: failed } },
    );
    return { ok: false, reason: "invalid" };
  }

  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 3600_000);
  await AdminSession.create({ tokenHash: sha256Hex(token), userId: user._id, expiresAt, lastSeenAt: new Date() });
  await AdminUser.updateOne({ _id: user._id }, { $set: { failedLogins: 0, lastLoginAt: new Date() }, $unset: { lockedUntil: 1 } });
  return { ok: true, token, expiresAt };
}

export async function resolveSessionToken(token: string | undefined): Promise<AdminIdentity | null> {
  if (!token || !/^[A-Za-z0-9_-]{30,60}$/.test(token)) return null;
  await connectDb();
  const session = await AdminSession.findOne({ tokenHash: sha256Hex(token) }).lean();
  if (!session || session.expiresAt.getTime() < Date.now()) return null;
  const user = await AdminUser.findById(session.userId).lean();
  if (!user || !user.active) return null;
  return { id: String(user._id), email: user.email, name: user.name, role: user.role as AdminRole };
}

export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  (await cookies()).set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "strict",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroyCurrentSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (token) {
    await connectDb();
    await AdminSession.deleteOne({ tokenHash: sha256Hex(token) });
  }
  store.delete(ADMIN_COOKIE);
}

export async function getCurrentAdmin(): Promise<AdminIdentity | null> {
  await connection(); // always request-time; never prerendered
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  return resolveSessionToken(token);
}

export function roleAllows(role: AdminRole, required: AdminRole): boolean {
  return required === "editor" ? role === "editor" || role === "owner" : role === "owner";
}

/**
 * Server-side guard for every admin page and server action. Never rely on
 * hidden URLs or client checks.
 */
export async function requireAdmin(required: AdminRole = "editor"): Promise<AdminIdentity> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  if (!roleAllows(admin.role, required)) redirect("/admin?denied=1");
  return admin;
}
