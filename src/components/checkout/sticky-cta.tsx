"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";

/** Mobile purchase bar, shown only once the main buy button has scrolled out of view. */
export function StickyCta({ price, targetId = "buy" }: { price: string; targetId?: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([entry]) => setShow(!entry.isIntersecting && entry.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [targetId]);
  return (
    <div
      aria-hidden={!show}
      className={clsx(
        "fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink-900/92 px-4 py-3 backdrop-blur-xl transition-transform duration-300 lg:hidden",
        show ? "translate-y-0" : "translate-y-full",
      )}
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-fg">AI SE SMART KAAM</p>
          <p className="text-xs text-fg-muted">{price} · Instant download</p>
        </div>
        <a href={`#${targetId}`} tabIndex={show ? 0 : -1} className="inline-flex h-11 items-center rounded-[var(--radius-control)] bg-cyan-400 px-5 text-sm font-semibold text-ink-950">
          Buy now
        </a>
      </div>
    </div>
  );
}
