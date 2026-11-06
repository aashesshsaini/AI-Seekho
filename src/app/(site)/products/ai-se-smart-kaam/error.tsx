"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Shown only when loading the product FAILS (e.g. database temporarily
 * unreachable). A missing product is a 404; a failure is not.
 */
export default function ProductError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[product] load failed", error.digest ?? "");
  }, [error]);
  return (
    <div className="container-page flex min-h-[60vh] max-w-2xl flex-col items-start justify-center py-20">
      <p className="eyebrow">AI SE SMART KAAM</p>
      <h1 className="display-md mt-4 text-fg">Playbook page abhi load nahi ho paaya.</h1>
      <p className="mt-4 leading-relaxed text-fg-muted">
        Yeh ek temporary technical issue hai — product hata nahi gaya hai. Kripya kuch second baad dobara try kariye. Koi payment is wajah se
        process nahi hua hai.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={reset} className="rounded-xl bg-cyan-400 px-5 py-2.5 font-semibold text-ink-950 hover:bg-cyan-300">
          Dobara try kariye
        </button>
        <Link href="/contact" className="rounded-xl border border-line-strong px-5 py-2.5 font-semibold text-fg hover:bg-white/5">
          Support se contact kariye
        </Link>
      </div>
    </div>
  );
}
