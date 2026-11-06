import clsx from "clsx";
import type { CSSProperties, ReactNode } from "react";

/**
 * Progressive scroll reveal using CSS scroll-driven animations. Content is
 * fully visible by default (no JS, reduced motion, unsupported browsers);
 * only supporting browsers get a subtle fade/slide as it enters the viewport.
 */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <div className={clsx("reveal", className)} style={{ "--reveal-delay": `${delay}s` } as CSSProperties}>
      {children}
    </div>
  );
}
