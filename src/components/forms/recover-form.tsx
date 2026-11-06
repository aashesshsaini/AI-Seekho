"use client";

import { useId, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button, Field, Notice, inputClass } from "@/components/ui";

export function RecoverForm() {
  const id = useId();
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const orderRef = String(fd.get("orderRef") ?? "").trim().toUpperCase();
    const errs: Record<string, string> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errs.email = "Sahi email address likhiye.";
    if (!/^AIS-[A-Z0-9]{5}-[A-Z0-9]{5}$/.test(orderRef)) errs.orderRef = "Order reference AIS-XXXXX-XXXXX format mein hona chahiye.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setState("sending");
    try {
      const res = await fetch("/api/recover", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, orderRef }) });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        setState("error");
        setMsg(res.status === 429 ? "Bahut zyada attempts. Ek ghante baad try kariye." : "Request process nahi ho paayi. Kripya dobara try kariye.");
        return;
      }
      setState("done");
      setMsg(data.message ?? "");
    } catch {
      setState("error");
      setMsg("Network error. Dobara try kariye.");
    }
  }

  if (state === "done") return <Notice tone="success" title="Request mil gayi">{msg}</Notice>;

  return (
    <form onSubmit={onSubmit} noValidate className="surface space-y-5 p-6 md:p-8">
      <Field label="Email" htmlFor={`${id}-email`} error={errors.email} required>
        <input id={`${id}-email`} name="email" type="email" autoComplete="email" className={inputClass} aria-invalid={Boolean(errors.email)} />
      </Field>
      <Field label="Order reference" htmlFor={`${id}-ref`} error={errors.orderRef} required>
        <input id={`${id}-ref`} name="orderRef" placeholder="AIS-XXXXX-XXXXX" autoCapitalize="characters" spellCheck={false} className={`${inputClass} font-mono uppercase`} aria-invalid={Boolean(errors.orderRef)} />
      </Field>
      {state === "error" && <p role="alert" className="text-sm text-danger">{msg}</p>}
      <Button type="submit" size="lg" disabled={state === "sending"}>
        {state === "sending" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        Recovery link bhejiye
      </Button>
    </form>
  );
}
