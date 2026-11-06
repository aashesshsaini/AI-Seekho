import "server-only";
import { z } from "zod";
import { connectDb } from "./db";
import { env } from "./env";
import { Enquiry } from "./models/content";
import { getEmailSender } from "./email";

export const enquirySchema = z.object({
  kind: z.enum(["service", "contact"]),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(254),
  phone: z
    .string()
    .trim()
    .max(16)
    .regex(/^$|^[+]?[0-9 ]{10,15}$/)
    .optional()
    .default(""),
  service: z.string().trim().max(80).regex(/^[a-z0-9-]*$/).optional().default(""),
  budget: z.enum(["", "under-10k", "10k-50k", "50k-plus"]).optional().default(""),
  subject: z.string().trim().max(160).optional().default(""),
  message: z.string().trim().min(10).max(4000),
  website: z.string().optional().default(""), // honeypot
  elapsedMs: z.number().int().nonnegative().optional().default(0),
  "cf-turnstile-response": z.string().max(4096).optional(),
});

export type EnquiryResult = { status: 200 | 400 | 503; body: Record<string, unknown> };

/** Spam heuristics: honeypot, too-fast submission, link stuffing. */
export function looksLikeSpam(d: z.infer<typeof enquirySchema>): boolean {
  if (d.website) return true;
  if (d.elapsedMs > 0 && d.elapsedMs < 2500) return true;
  const links = (d.message.match(/https?:\/\//g) ?? []).length;
  return links > 3;
}

export async function verifyTurnstile(token: string | undefined, ip: string): Promise<boolean> {
  const secret = env.turnstileSecret;
  if (!secret) return true; // not configured — other protections still apply
  if (!token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
      signal: AbortSignal.timeout(8000),
    });
    const data = (await res.json()) as { success?: boolean };
    return Boolean(data.success);
  } catch {
    return false;
  }
}

export async function submitEnquiry(raw: unknown, ip: string): Promise<EnquiryResult> {
  const parsed = enquirySchema.safeParse(raw);
  if (!parsed.success) return { status: 400, body: { error: "invalid_request" } };
  const d = parsed.data;
  // Silently accept spam so bots get no signal, but do not store it.
  if (looksLikeSpam(d)) return { status: 200, body: { ok: true } };
  if (!(await verifyTurnstile(d["cf-turnstile-response"], ip))) return { status: 400, body: { error: "verification_failed" } };

  await connectDb();
  const doc = await Enquiry.create({
    kind: d.kind,
    name: d.name,
    email: d.email,
    phone: d.phone,
    service: d.service,
    budget: d.budget,
    subject: d.subject,
    message: d.message,
  });

  const notify = env.adminNotifyEmail;
  const sender = getEmailSender();
  if (notify && sender.configured) {
    await sender.send({
      to: notify,
      subject: `New ${d.kind} enquiry — ${d.name}`,
      text: `New ${d.kind} enquiry received. Open the admin dashboard to view it (id ${doc._id}).`,
      html: `<p>New ${d.kind} enquiry received. Open the admin dashboard to view it (id ${doc._id}).</p>`,
    });
  }
  return { status: 200, body: { ok: true } };
}
