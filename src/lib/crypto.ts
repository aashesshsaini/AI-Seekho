import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

function aesKey(secret: string, purpose: string): Buffer {
  return createHash("sha256").update(`${purpose}:${secret}`).digest();
}

/** AES-256-GCM. Used so a buyer's existing download link can be re-shown to a verified holder. */
export function encryptString(plain: string, secret: string, purpose: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", aesKey(secret, purpose), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), ct].map((b) => b.toString("base64url")).join(".");
}

export function decryptString(payload: string, secret: string, purpose: string): string | null {
  try {
    const [iv, tag, ct] = payload.split(".").map((p) => Buffer.from(p, "base64url"));
    const d = createDecipheriv("aes-256-gcm", aesKey(secret, purpose), iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(ct), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256Hex(input: string | Buffer): string {
  return createHash("sha256").update(input).digest("hex");
}

export function hmacSha256Hex(key: string, message: string | Buffer): string {
  return createHmac("sha256", key).update(message).digest("hex");
}

/** Constant-time comparison for hex/ascii strings of possibly different length. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) {
    // Still do a comparison to keep timing roughly uniform.
    timingSafeEqual(ab, ab);
    return false;
  }
  return timingSafeEqual(ab, bb);
}

/** Short, human-friendly public order reference (no ambiguous characters). */
export function publicOrderId(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const buf = randomBytes(10);
  let s = "";
  for (let i = 0; i < 10; i++) s += alphabet[buf[i] % alphabet.length];
  return `AIS-${s.slice(0, 5)}-${s.slice(5)}`;
}

/** Hash an IP for abuse tracking without storing it in clear text. */
export function hashIp(ip: string, secret: string): string {
  return hmacSha256Hex(secret, `ip:${ip}`).slice(0, 32);
}
