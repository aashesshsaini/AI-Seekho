/**
 * Safe first-admin setup (no default password, no web setup endpoint).
 * Usage: npm run admin:create -- --email you@example.com --name "Your Name" [--role owner|editor]
 * The password is read from a hidden prompt (or ADMIN_PASSWORD for CI only).
 */
import mongoose from "mongoose";
import { createInterface } from "node:readline";
import { AdminUser } from "../src/lib/models/system";
import { hashPassword, validatePasswordStrength } from "../src/lib/auth/password";

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

function askHidden(q: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const out = rl as unknown as { _writeToOutput: (s: string) => void; output: NodeJS.WriteStream };
    let muted = false;
    out._writeToOutput = (s: string) => {
      if (!muted) out.output.write(s);
    };
    rl.question(q, (a) => {
      rl.close();
      process.stdout.write("\n");
      resolve(a);
    });
    muted = true;
  });
}

async function main() {
  const email = arg("email")?.trim().toLowerCase();
  const name = arg("name")?.trim();
  const role = (arg("role") ?? "owner") as "owner" | "editor";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name) throw new Error('Usage: npm run admin:create -- --email you@example.com --name "Name" [--role owner|editor]');
  if (!["owner", "editor"].includes(role)) throw new Error("role must be owner or editor");
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");

  let password = process.env.ADMIN_PASSWORD ?? "";
  if (!password) {
    password = await askHidden("Password (min 12 chars, letters + numbers): ");
    const again = await askHidden("Repeat password: ");
    if (password !== again) throw new Error("Passwords do not match");
  }
  const weak = validatePasswordStrength(password);
  if (weak) throw new Error(weak);

  await mongoose.connect(uri, { dbName: process.env.MONGODB_DB ?? "aiseekho" });
  await AdminUser.syncIndexes();
  if (await AdminUser.exists({ email })) throw new Error("An admin with this email already exists");
  await AdminUser.create({ email, name, role, passwordHash: await hashPassword(password) });
  console.log(`Created ${role} admin ${email}. Sign in at /admin/login`);
  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error(e instanceof Error ? e.message : e);
  await mongoose.disconnect();
  process.exit(1);
});
