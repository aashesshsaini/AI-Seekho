import { Plus } from "lucide-react";
import type { ReactNode } from "react";

export type FaqItem = { q: string; a: ReactNode };

/** Native <details> accordion — accessible and works without JavaScript. */
export function Faq({ items }: { items: FaqItem[] }) {
  return (
    <div className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-white/[0.015]">
      {items.map((item) => (
        <details key={item.q} className="group px-5 md:px-7 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-left text-[1.02rem] font-medium text-fg">
            {item.q}
            <Plus className="h-5 w-5 shrink-0 text-fg-subtle transition-transform duration-300 group-open:rotate-45" aria-hidden />
          </summary>
          <div className="-mt-1 pb-6 pr-8 text-[0.97rem] leading-relaxed text-fg-muted">{item.a}</div>
        </details>
      ))}
    </div>
  );
}
