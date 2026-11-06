#!/usr/bin/env node
/**
 * Netlify build preflight. Runs before `next build` (see netlify.toml).
 * Fails fast — failed builds cost 0 Netlify credits — on configuration that
 * would leak secrets or break the deploy. Prints variable NAMES only, never values.
 */
import { existsSync } from "node:fs";

const onNetlify = Boolean(process.env.NETLIFY || process.env.CONTEXT || process.env.BUILD_ID || process.env.DEPLOY_ID);
if (!onNetlify) {
  console.log("preflight: not a Netlify build — skipped");
  process.exit(0);
}

const errors = [];
const warnings = [];
const env = (k) => (process.env[k] ?? "").trim();

// 1) Local secret files / private data must never be packaged into functions.
//    (The Next.js runtime copies .env files into the server function bundle.)
for (const f of [".env", ".env.local", ".env.production", ".env.production.local", ".env.staging.local", ".private-assets", ".data"]) {
  if (existsSync(f)) errors.push(`"${f}" exists in the build directory. Deploy from Git (it is gitignored), not from a local folder with secrets.`);
}

// 2) Required variables.
for (const k of ["NEXT_PUBLIC_SITE_URL", "APP_SECRET", "MONGODB_URI", "MONGODB_DB", "RAZORPAY_MODE", "STORAGE_DRIVER"]) {
  if (!env(k)) errors.push(`${k} is not set`);
}
if (env("APP_SECRET") && env("APP_SECRET").length < 32) errors.push("APP_SECRET must be at least 32 characters");
if (env("NEXT_PUBLIC_SITE_URL") && !/^https:\/\/[^/]+$/.test(env("NEXT_PUBLIC_SITE_URL"))) {
  errors.push("NEXT_PUBLIC_SITE_URL must look like https://your-site.netlify.app (https, no trailing slash, no path)");
}
const uri = env("MONGODB_URI");
if (uri) {
  if (/^["']|["']$/.test(uri)) errors.push("MONGODB_URI is wrapped in quotes — remove them");
  if (/\s/.test(uri)) errors.push("MONGODB_URI contains whitespace/newline");
  if (/<(db_)?password>/i.test(uri)) errors.push("MONGODB_URI still contains the <db_password> placeholder");
  if (/127\.0\.0\.1|localhost/.test(uri)) errors.push("MONGODB_URI points to localhost — use the Atlas connection string");
}
if (env("STORAGE_DRIVER") && env("STORAGE_DRIVER") !== "netlify-blobs") errors.push('STORAGE_DRIVER must be "netlify-blobs" on Netlify');

// 3) Payments: test mode unless live is explicitly approved; key must match mode.
const mode = env("RAZORPAY_MODE");
const keyId = env("RAZORPAY_KEY_ID");
if (mode && mode !== "test" && mode !== "live") errors.push('RAZORPAY_MODE must be "test" or "live"');
if (mode === "live" && env("LIVE_PAYMENTS_APPROVED") !== "yes") errors.push('RAZORPAY_MODE=live requires LIVE_PAYMENTS_APPROVED=yes (explicit owner approval)');
if (keyId && mode === "test" && !keyId.startsWith("rzp_test_")) errors.push("RAZORPAY_KEY_ID is not a test key (rzp_test_…) but RAZORPAY_MODE=test");
if (keyId && mode === "live" && !keyId.startsWith("rzp_live_")) errors.push("RAZORPAY_KEY_ID is not a live key but RAZORPAY_MODE=live");
if (!keyId || !env("RAZORPAY_KEY_SECRET")) warnings.push("Razorpay keys not set — checkout will show 'not configured'");
if (!env("RAZORPAY_WEBHOOK_SECRET")) warnings.push("RAZORPAY_WEBHOOK_SECRET not set — webhooks will be rejected (503)");

// 4) Staging gate: both or neither; a short password silently disables the gate.
const gu = env("STAGING_GATE_USER");
const gp = env("STAGING_GATE_PASSWORD");
if ((gu && !gp) || (!gu && gp)) errors.push("Set BOTH STAGING_GATE_USER and STAGING_GATE_PASSWORD, or neither");
if (gu && gp && gp.length < 12) errors.push("STAGING_GATE_PASSWORD must be at least 12 characters (otherwise the gate is OFF and the site is public)");
if (!gu && !gp) warnings.push("Staging gate is OFF — the site will be publicly accessible");

// 5) Secrets must never be in NEXT_PUBLIC_* (shipped to browsers).
for (const [k, v] of Object.entries(process.env)) {
  if (k.startsWith("NEXT_PUBLIC_") && /SECRET|PASSWORD|TOKEN|KEY_SECRET|MONGODB/i.test(k)) errors.push(`${k}: secrets must not use the NEXT_PUBLIC_ prefix`);
  if (k.startsWith("NEXT_PUBLIC_") && typeof v === "string" && /mongodb(\+srv)?:\/\//.test(v)) errors.push(`${k} contains a database URI`);
}

for (const w of warnings) console.log(`preflight warning: ${w}`);
if (errors.length) {
  console.error("\npreflight FAILED — fix these in Netlify → Project configuration → Environment variables:");
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log(`preflight OK (context=${process.env.CONTEXT ?? "unknown"}, payments=${mode}, gate=${gu ? "on" : "off"})`);
