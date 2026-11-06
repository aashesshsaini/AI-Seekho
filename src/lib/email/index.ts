import "server-only";
import { env } from "../env";

export type EmailMessage = { to: string; subject: string; text: string; html: string };
export type EmailResult = { status: "sent" } | { status: "not_configured" } | { status: "failed"; error: string };

export interface EmailSender {
  readonly configured: boolean;
  send(msg: EmailMessage): Promise<EmailResult>;
}

const notConfigured: EmailSender = {
  configured: false,
  async send() {
    return { status: "not_configured" };
  },
};

function resendSender(apiKey: string, from: string): EmailSender {
  return {
    configured: true,
    async send(msg) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from, to: [msg.to], subject: msg.subject, text: msg.text, html: msg.html }),
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return { status: "failed", error: `Email provider responded ${res.status}` };
        return { status: "sent" };
      } catch {
        return { status: "failed", error: "Email provider request failed" };
      }
    },
  };
}

let override: EmailSender | null = null;
export function setEmailSenderForTests(s: EmailSender | null): void {
  override = s;
}

export function getEmailSender(): EmailSender {
  if (override) return override;
  if (env.emailProvider === "resend" && env.resendApiKey && env.emailFrom) {
    return resendSender(env.resendApiKey, env.emailFrom);
  }
  return notConfigured;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function purchaseEmail(p: { name: string; productName: string; orderRef: string; downloadUrl: string; expiresOn: string; supportEmail: string }): Omit<EmailMessage, "to"> {
  const greeting = p.name ? `Namaste ${p.name},` : "Namaste,";
  const text = [
    greeting,
    "",
    `Aapka payment verify ho gaya hai. Shukriya ki aapne ${p.productName} liya!`,
    "",
    `Order reference: ${p.orderRef}`,
    `Download link (${p.expiresOn} tak valid): ${p.downloadUrl}`,
    "",
    "Is link ko kisi ke saath share mat kariye — yeh aapki personal purchase ke liye hai.",
    "Link kaam na kare toh website par 'Download recover kariye' page use kariye.",
    p.supportEmail ? `Help ke liye: ${p.supportEmail}` : "",
    "",
    "— AI SEEKHO",
  ].join("\n");
  const html = `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:auto;color:#0e152b">
<p>${escapeHtml(greeting)}</p>
<p>Aapka payment verify ho gaya hai. Shukriya ki aapne <strong>${escapeHtml(p.productName)}</strong> liya!</p>
<p style="color:#555">Order reference: <strong>${escapeHtml(p.orderRef)}</strong></p>
<p><a href="${escapeHtml(p.downloadUrl)}" style="display:inline-block;background:#2b5ce6;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">Apni files download kariye</a></p>
<p style="color:#555;font-size:14px">Link ${escapeHtml(p.expiresOn)} tak valid hai. Ise share mat kariye — yeh aapki personal purchase ke liye hai.</p>
${p.supportEmail ? `<p style="color:#555;font-size:14px">Help ke liye: ${escapeHtml(p.supportEmail)}</p>` : ""}
<p>— AI SEEKHO</p></div>`;
  return { subject: `Aapka ${p.productName} download ready hai (${p.orderRef})`, text, html };
}
