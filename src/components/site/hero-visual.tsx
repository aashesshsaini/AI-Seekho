import { OutputBars } from "./output-bars";

/**
 * Brand visual: an editorial "prompt workbench" showing how a vague request
 * becomes a structured RASTA prompt. Pure HTML/CSS — no robots, no stock art.
 */
const TOKENS = [
  { k: "R", label: "Role", text: "Tum ek friendly social media manager ho." },
  { k: "A", label: "Aim", text: "Diwali offer ke 3 Instagram captions likho." },
  { k: "S", label: "Situation", text: "Jaipur ki chhoti bakery · customers: students aur families." },
  { k: "T", label: "Type", text: "Hinglish · har caption 40 shabd se kam · end mein CTA." },
];

export function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[520px]" aria-hidden>
      {/* constellation motif from the cover */}
      <svg viewBox="0 0 400 400" className="pointer-events-none absolute -right-10 -top-16 hidden h-[360px] sm:block w-[360px] opacity-60" fill="none">
        <circle cx="230" cy="170" r="120" stroke="rgb(95 225 242 / 0.14)" />
        <circle cx="230" cy="170" r="70" stroke="rgb(95 225 242 / 0.18)" />
        <path d="M230 170 L150 60 L110 120 M230 170 L330 90 M230 170 L300 290 L360 320 M230 170 L130 250" stroke="rgb(95 225 242 / 0.28)" />
        {[
          [230, 170, 5],
          [150, 60, 3],
          [110, 120, 2.5],
          [330, 90, 3],
          [300, 290, 3],
          [360, 320, 2.5],
          [130, 250, 3],
        ].map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill="rgb(95 225 242 / 0.8)" />
        ))}
      </svg>

      <div className="relative surface overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <span className="text-xs font-semibold tracking-[0.16em] text-fg-subtle uppercase">Prompt · RASTA</span>
          <span className="rounded-full bg-cyan-400/10 px-2.5 py-0.5 text-[11px] font-medium text-cyan-300">Draft 1</span>
        </div>
        <div className="space-y-3 p-5">
          <p className="rounded-xl border border-dashed border-line-strong px-4 py-3 text-sm text-fg-subtle line-through decoration-fg-subtle/60">
            &ldquo;Diwali ka caption likh do&rdquo;
          </p>
          <ul className="space-y-2.5">
            {TOKENS.map((t) => (
              <li key={t.k} className="flex gap-3 rounded-xl bg-white/[0.025] px-3 py-2.5">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 text-xs font-bold text-white">
                  {t.k}
                </span>
                <span className="text-sm leading-snug">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-400/90">{t.label}</span>
                  <span className="text-fg">{t.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="surface relative -mt-6 ml-auto mr-[-8px] w-[78%] p-4 sm:mr-[-28px]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-subtle">Output</p>
        <OutputBars />
        <p className="mt-3.5 flex items-center gap-2 text-xs text-fg-muted">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" />
          Verify: offer dates aur prices khud check kariye
        </p>
      </div>
    </div>
  );
}
