import "server-only";
import { connectDb } from "./db";
import { AuditLog } from "./models/system";
import type { AdminIdentity } from "./auth/session";

export async function audit(actor: AdminIdentity | null, action: string, target = "", meta: Record<string, unknown> = {}): Promise<void> {
  try {
    await connectDb();
    await AuditLog.create({
      actorId: actor?.id,
      actorEmail: actor?.email ?? "system",
      action,
      target,
      meta,
    });
  } catch (err) {
    console.error("[audit] failed to write audit log", (err as Error).message);
  }
}
