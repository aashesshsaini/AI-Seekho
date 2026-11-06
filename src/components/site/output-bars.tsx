"use client";

import { motion, useReducedMotion } from "motion/react";

const WIDTHS = ["92%", "76%", "84%"];

/** Decorative "draft being written" bars. Static end-state on the server and with reduced motion. */
export function OutputBars() {
  const reduce = useReducedMotion();
  return (
    <div className="mt-3 space-y-2">
      {WIDTHS.map((w, i) => (
        <motion.div
          key={w}
          className="h-2 origin-left rounded-full bg-white/10"
          style={{ width: w }}
          initial={false}
          animate={reduce ? undefined : { scaleX: [1, 0.15, 1] }}
          transition={reduce ? undefined : { duration: 2.4, ease: [0.22, 1, 0.36, 1], delay: 1.2 + i * 0.35, repeat: Infinity, repeatDelay: 5 }}
        />
      ))}
    </div>
  );
}
