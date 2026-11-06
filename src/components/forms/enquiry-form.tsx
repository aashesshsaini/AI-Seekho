"use client";

import Script from "next/script";
import { useId, useRef, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button, Field, inputClass } from "@/components/ui";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

export function EnquiryForm({ kind, services = [] }: { kind: "service" | "contact"; services?: { slug: string; title: string }[] }) {
  const id = useId();
  const startedAt = useRef<number>(0);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function onFocusOnce() {
    if (!startedAt.current) startedAt.current = Date.now();
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const body = Object.fromEntries(fd.entries()) as Record<string, string>;
    const errs: Record<string, string> = {};
    if ((body.name ?? "").trim().length < 2) errs.name = "Apna naam likhiye.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(body.email ?? "")) errs.email = "Sahi email address likhiye.";
    if ((body.message ?? "").trim().length < 10) errs.message = "Thoda detail mein likhiye (kam se kam 10 characters).";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setState("sending");
    try {
      const res = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, kind, elapsedMs: startedAt.current ? Date.now() - startedAt.current : 0 }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setState("error");
        setMessage(
          res.status === 429
            ? "Bahut zyada requests. Thodi der baad try kariye."
            : data.error === "storage_unavailable"
              ? "Form abhi save nahi ho paa raha (database configure nahi hai). Kripya email se contact kariye."
              : "Message bhej nahi paaye. Kripya details check karke dobara try kariye.",
        );
        return;
      }
      form.reset();
      setState("sent");
    } catch {
      setState("error");
      setMessage("Network error. Internet check karke dobara try kariye.");
    }
  }

  if (state === "sent") {
    return (
      <div role="status" className="surface flex items-start gap-4 p-7">
        <CheckCircle2 className="h-6 w-6 shrink-0 text-success" aria-hidden />
        <div>
          <p className="font-semibold text-fg">Shukriya! Aapka message mil gaya.</p>
          <p className="mt-1 text-fg-muted">Hum aapke diye email par reply karenge.</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} onFocus={onFocusOnce} noValidate className="surface relative space-y-5 p-6 md:p-8">
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Naam" htmlFor={`${id}-name`} error={errors.name} required>
          <input id={`${id}-name`} name="name" autoComplete="name" maxLength={120} className={inputClass} aria-invalid={Boolean(errors.name)} />
        </Field>
        <Field label="Email" htmlFor={`${id}-email`} error={errors.email} required>
          <input id={`${id}-email`} name="email" type="email" autoComplete="email" maxLength={254} className={inputClass} aria-invalid={Boolean(errors.email)} />
        </Field>
      </div>
      {kind === "service" ? (
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Service" htmlFor={`${id}-service`}>
            <select id={`${id}-service`} name="service" className={inputClass} defaultValue="">
              <option value="">Choose a service</option>
              {services.map((s) => (
                <option key={s.slug} value={s.slug}>{s.title}</option>
              ))}
              <option value="other">Kuch aur / sure nahi</option>
            </select>
          </Field>
          <Field label="Approx. budget (optional)" htmlFor={`${id}-budget`}>
            <select id={`${id}-budget`} name="budget" className={inputClass} defaultValue="">
              <option value="">Prefer not to say</option>
              <option value="under-10k">₹10,000 se kam</option>
              <option value="10k-50k">₹10,000 – ₹50,000</option>
              <option value="50k-plus">₹50,000+</option>
            </select>
          </Field>
        </div>
      ) : (
        <Field label="Subject" htmlFor={`${id}-subject`}>
          <input id={`${id}-subject`} name="subject" maxLength={160} className={inputClass} />
        </Field>
      )}
      <Field label="Phone (optional)" htmlFor={`${id}-phone`}>
        <input id={`${id}-phone`} name="phone" type="tel" autoComplete="tel" maxLength={16} className={inputClass} />
      </Field>
      <Field label="Message" htmlFor={`${id}-message`} error={errors.message} required hint={kind === "service" ? "Apne business, goal aur timeline ke baare mein likhiye." : undefined}>
        <textarea id={`${id}-message`} name="message" rows={5} maxLength={4000} className={inputClass} aria-invalid={Boolean(errors.message)} />
      </Field>
      {/* Honeypot: humans never see or fill this. */}
      <div aria-hidden className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden">
        <label htmlFor={`${id}-website`}>Website</label>
        <input id={`${id}-website`} name="website" tabIndex={-1} autoComplete="off" />
      </div>
      {TURNSTILE_SITE_KEY && (
        <>
          <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
          <div className="cf-turnstile" data-sitekey={TURNSTILE_SITE_KEY} data-theme="dark" />
        </>
      )}
      {state === "error" && (
        <p role="alert" className="rounded-lg border border-danger/30 bg-danger/[0.07] px-3 py-2 text-sm text-danger">{message}</p>
      )}
      <p className="text-xs text-fg-subtle">
        Yeh jaankari sirf aapko reply karne ke liye use hogi. Kripya passwords, OTP ya payment details na likhein.
      </p>
      <Button type="submit" size="lg" disabled={state === "sending"}>
        {state === "sending" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {kind === "service" ? "Send enquiry" : "Send message"}
      </Button>
    </form>
  );
}
