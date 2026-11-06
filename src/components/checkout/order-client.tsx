"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2 } from "lucide-react";

/** Polls the cookie-authorized status endpoint while a payment is pending. */
export function PendingPoller({ publicId }: { publicId: string }) {
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);
  const tries = useRef(0);
  useEffect(() => {
    let stopped = false;
    const tick = async () => {
      if (stopped) return;
      tries.current += 1;
      try {
        const res = await fetch(`/api/orders/${publicId}/status`, { cache: "no-store" });
        const data = (await res.json()) as { status?: string };
        if (data.status && data.status !== "pending") {
          router.refresh();
          return;
        }
      } catch {
        /* keep polling */
      }
      if (tries.current >= 60) {
        setTimedOut(true);
        return;
      }
      setTimeout(tick, tries.current < 10 ? 2000 : 5000);
    };
    const t = setTimeout(tick, 1500);
    return () => {
      stopped = true;
      clearTimeout(t);
    };
  }, [publicId, router]);

  return (
    <p className="mt-4 flex items-center gap-2 text-sm text-fg-muted" aria-live="polite">
      {timedOut ? (
        "Confirmation mein samay lag raha hai. Yeh page baad mein dobara kholiye — payment confirm hote hi downloads yahin dikhenge."
      ) : (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Payment confirmation check kar rahe hain…
        </>
      )}
    </p>
  );
}

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <input readOnly value={url} aria-label="Personal download link" className="min-w-0 flex-1 rounded-[var(--radius-control)] border border-line-strong bg-ink-950/60 px-3 py-2.5 text-sm text-fg-muted" onFocus={(e) => e.currentTarget.select()} />
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            /* clipboard blocked — user can still select the field */
          }
        }}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-line-strong px-4 text-sm font-semibold text-fg hover:bg-white/5"
      >
        {copied ? <Check className="h-4 w-4 text-success" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
