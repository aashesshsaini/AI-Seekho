"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Lock, X } from "lucide-react";
import { Button, Field, inputClass } from "@/components/ui";
import { trackEvent } from "@/components/site/consent";

type CreateResponse = {
  publicId: string;
  keyId: string;
  razorpayOrderId: string;
  amount: number;
  currency: "INR";
  productName: string;
  prefill: { name: string; email: string; contact?: string };
};

type RazorpayInstance = { open: () => void; on: (ev: string, cb: (r: { error?: { description?: string } }) => void) => void };
type RazorpayCtor = new (opts: Record<string, unknown>) => RazorpayInstance;

let scriptPromise: Promise<RazorpayCtor> | null = null;
function loadRazorpay(): Promise<RazorpayCtor> {
  const w = window as unknown as { Razorpay?: RazorpayCtor };
  if (w.Razorpay) return Promise.resolve(w.Razorpay);
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.async = true;
      s.onload = () => (w.Razorpay ? resolve(w.Razorpay) : reject(new Error("Razorpay unavailable")));
      s.onerror = () => {
        scriptPromise = null;
        reject(new Error("Razorpay script failed to load"));
      };
      document.body.appendChild(s);
    });
  }
  return scriptPromise;
}

const MESSAGES: Record<string, string> = {
  invalid_request: "Kripya apna naam aur sahi email address bhariye.",
  product_unavailable: "Yeh product abhi available nahi hai.",
  payments_not_configured: "Online checkout abhi configure nahi hua hai. Kripya thodi der baad try kariye ya support se contact kariye.",
  rate_limited: "Bahut zyada attempts. Thodi der baad dobara try kariye.",
  gateway_error: "Payment gateway se connect nahi ho paaya. Kripya dobara try kariye.",
};

export function BuyButton({ label, productSlug, className, size = "lg" }: { label: string; productSlug: string; className?: string; size?: "md" | "lg" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const dialogRef = useRef<HTMLDialogElement>(null);
  const id = useId();

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();
    const phone = String(fd.get("phone") ?? "").trim();
    const agree = fd.get("agree") === "on";
    const errs: Record<string, string> = {};
    if (name.length < 2) errs.name = "Apna naam likhiye.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errs.email = "Sahi email address likhiye — download link isi par aayega.";
    if (phone && !/^[+]?[0-9 ]{10,15}$/.test(phone)) errs.phone = "Sahi mobile number likhiye (ya khaali chhod dijiye).";
    if (!agree) errs.agree = "Aage badhne ke liye terms aur refund policy se sahmati zaroori hai.";
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    try {
      const res = await fetch("/api/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productSlug, name, email, phone: phone || undefined, agree }),
      });
      const data = (await res.json().catch(() => ({}))) as Partial<CreateResponse> & { error?: string };
      if (!res.ok || !data.razorpayOrderId) {
        setError(MESSAGES[data.error ?? ""] ?? "Kuch galat ho gaya. Kripya dobara try kariye.");
        setBusy(false);
        return;
      }
      trackEvent("begin_checkout", { value: (data.amount ?? 0) / 100, currency: "INR", item_id: productSlug });
      const Razorpay = await loadRazorpay();
      const publicId = data.publicId!;
      const rzp = new Razorpay({
        key: data.keyId,
        order_id: data.razorpayOrderId,
        amount: data.amount,
        currency: data.currency,
        name: "AI SEEKHO",
        description: data.productName,
        prefill: data.prefill,
        notes: { order_ref: publicId },
        theme: { color: "#2b5ce6" },
        modal: {
          ondismiss: () => setBusy(false),
          confirm_close: true,
        },
        handler: async (resp: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          // Browser callback is NOT proof of payment — the server verifies it.
          try {
            await fetch("/api/checkout/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ publicId, ...resp }),
            });
          } finally {
            router.push(`/order/${publicId}`);
          }
        },
      });
      rzp.on("payment.failed", () => {
        // Razorpay lets the buyer retry inside the same modal; we just inform.
        setError("Payment complete nahi hua. Aap dobara try kar sakte hain — paisa kata ho toh order page check kariye.");
      });
      setOpen(false);
      rzp.open();
    } catch {
      setError("Payment window load nahi ho paayi. Internet connection check karke dobara try kariye.");
      setBusy(false);
    }
  }

  return (
    <>
      <Button type="button" size={size} className={className} onClick={() => setOpen(true)} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Lock className="h-4 w-4" aria-hidden />}
        {label}
      </Button>
      {error && !open && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
      <dialog
        ref={dialogRef}
        aria-labelledby={`${id}-title`}
        onClose={() => setOpen(false)}
        className="m-auto w-[min(100%-2rem,460px)] rounded-[var(--radius-card)] border border-line-strong bg-ink-800 p-0 text-fg shadow-2xl backdrop:bg-ink-950/75 backdrop:backdrop-blur-sm"
      >
        <form onSubmit={onSubmit} noValidate className="p-6 md:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id={`${id}-title`} className="text-lg font-semibold">
                Secure checkout
              </h2>
              <p className="mt-1 text-sm text-fg-muted">Download link aur receipt is email par bheje jayenge.</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="rounded-lg p-1.5 text-fg-muted hover:bg-white/5 hover:text-fg">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-6 space-y-4">
            <Field label="Naam" htmlFor={`${id}-name`} error={fieldErrors.name} required>
              <input id={`${id}-name`} name="name" autoComplete="name" maxLength={120} className={inputClass} aria-invalid={Boolean(fieldErrors.name)} aria-describedby={fieldErrors.name ? `${id}-name-error` : undefined} />
            </Field>
            <Field label="Email" htmlFor={`${id}-email`} error={fieldErrors.email} required>
              <input id={`${id}-email`} name="email" type="email" inputMode="email" autoComplete="email" maxLength={254} className={inputClass} aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? `${id}-email-error` : undefined} />
            </Field>
            <Field label="Mobile (optional)" htmlFor={`${id}-phone`} error={fieldErrors.phone} hint="Payment window mein pre-fill ke liye.">
              <input id={`${id}-phone`} name="phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={16} className={inputClass} aria-invalid={Boolean(fieldErrors.phone)} />
            </Field>
            <div>
              <label className="flex items-start gap-3 text-sm leading-relaxed text-fg-muted">
                <input type="checkbox" name="agree" className="mt-1 h-4 w-4 accent-cyan-400" aria-invalid={Boolean(fieldErrors.agree)} />
                <span>
                  Main samajhta/samajhti hoon ki yeh ek digital download hai, aur main{" "}
                  <Link href="/legal/terms" target="_blank" className="text-cyan-400 underline">Terms</Link> aur{" "}
                  <Link href="/legal/refund-policy" target="_blank" className="text-cyan-400 underline">Refund Policy</Link> se sahmat hoon.
                </span>
              </label>
              {fieldErrors.agree && <p className="mt-1.5 text-xs text-danger" role="alert">{fieldErrors.agree}</p>}
            </div>
          </div>
          {error && (
            <p role="alert" className="mt-4 rounded-lg border border-danger/30 bg-danger/[0.07] px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" className="mt-6 w-full" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Lock className="h-4 w-4" aria-hidden />}
            Continue to payment
          </Button>
          <p className="mt-3 text-center text-xs text-fg-subtle">Payments Razorpay dwara securely process hote hain. Hum card/UPI details store nahi karte.</p>
        </form>
      </dialog>
    </>
  );
}
