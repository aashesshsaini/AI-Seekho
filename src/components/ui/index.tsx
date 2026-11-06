import Link from "next/link";
import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";

/* ------------------------------------------------------------------ Button */

type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "lg" | "sm";

const base =
  "inline-flex items-center justify-center gap-2 font-semibold rounded-[var(--radius-control)] transition-[background,box-shadow,color,border-color,transform] duration-200 ease-[var(--ease-out-soft)] disabled:opacity-50 disabled:pointer-events-none select-none whitespace-nowrap";
const variants: Record<Variant, string> = {
  primary:
    "bg-cyan-400 text-ink-950 hover:bg-cyan-300 shadow-[0_0_0_1px_rgb(138_240_251/0.4),0_10px_30px_-10px_rgb(95_225_242/0.55)] active:translate-y-px",
  secondary: "bg-white/[0.04] text-fg border border-line-strong hover:bg-white/[0.08] hover:border-white/25 active:translate-y-px",
  ghost: "text-fg-muted hover:text-fg hover:bg-white/[0.05]",
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-[0.95rem]",
  lg: "h-13 px-6 text-base",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra?: string) {
  return clsx(base, variants[variant], sizes[size], extra);
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: { href: string; variant?: Variant; size?: Size; className?: string; children: ReactNode } & Omit<ComponentProps<typeof Link>, "href" | "className">) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...rest
}: { variant?: Variant; size?: Size } & ComponentProps<"button">) {
  return <button className={buttonClass(variant, size, className)} {...rest} />;
}

/* ------------------------------------------------------------------- Badge */

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "cyan" | "violet" | "success" | "warning" | "danger"; className?: string }) {
  const tones = {
    neutral: "border-line-strong text-fg-muted bg-white/[0.03]",
    cyan: "border-cyan-400/30 text-cyan-300 bg-cyan-400/[0.07]",
    violet: "border-violet-400/30 text-violet-400 bg-violet-400/[0.07]",
    success: "border-success/30 text-success bg-success/[0.08]",
    warning: "border-warning/30 text-warning bg-warning/[0.08]",
    danger: "border-danger/30 text-danger bg-danger/[0.08]",
  } as const;
  return (
    <span className={clsx("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium", tones[tone], className)}>
      {children}
    </span>
  );
}

/* ----------------------------------------------------------------- Section */

export function Section({ id, className, children, labelledBy }: { id?: string; className?: string; children: ReactNode; labelledBy?: string }) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={clsx("py-20 md:py-28", className)}>
      <div className="container-page">{children}</div>
    </section>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  lead,
  id,
  align = "left",
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  id?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div className={clsx("max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
      <h2 id={id} className="display-lg text-fg">
        {title}
      </h2>
      {lead && <p className="mt-5 text-lg leading-relaxed text-fg-muted">{lead}</p>}
    </div>
  );
}

/* -------------------------------------------------------------------- Card */

export function Card({ className, children, as: As = "div" }: { className?: string; children: ReactNode; as?: "div" | "article" | "li" }) {
  return <As className={clsx("surface p-6 md:p-7", className)}>{children}</As>;
}

/* ------------------------------------------------------------------- Notice */

export function Notice({ tone = "info", title, children, className }: { tone?: "info" | "warning" | "success" | "danger"; title?: string; children: ReactNode; className?: string }) {
  const tones = {
    info: "border-cyan-400/25 bg-cyan-400/[0.05]",
    warning: "border-warning/30 bg-warning/[0.06]",
    success: "border-success/30 bg-success/[0.06]",
    danger: "border-danger/30 bg-danger/[0.06]",
  } as const;
  return (
    <div role={tone === "danger" ? "alert" : "note"} className={clsx("rounded-2xl border px-5 py-4 text-sm leading-relaxed text-fg-muted", tones[tone], className)}>
      {title && <p className="mb-1 font-semibold text-fg">{title}</p>}
      {children}
    </div>
  );
}

/* --------------------------------------------------------------- Form bits */

export function Field({ label, htmlFor, hint, error, children, required }: { label: string; htmlFor: string; hint?: string; error?: string; children: ReactNode; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-fg">
        {label}
        {required && <span className="text-cyan-400" aria-hidden> *</span>}
      </label>
      {children}
      {hint && !error && <p id={`${htmlFor}-hint`} className="text-xs text-fg-subtle">{hint}</p>}
      {error && (
        <p id={`${htmlFor}-error`} className="text-xs text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export const inputClass =
  "block w-full rounded-[var(--radius-control)] border border-line-strong bg-ink-950/60 px-3.5 py-2.5 text-[0.95rem] text-fg placeholder:text-fg-subtle transition-colors focus:border-cyan-400/70 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 aria-[invalid=true]:border-danger/70";

/* --------------------------------------------------------------------- Logo */

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="none">
      <rect x="5.2" y="5.2" width="13.6" height="13.6" rx="2.2" transform="rotate(45 12 12)" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="2.1" fill="currentColor" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-2.5", className)}>
      <LogoMark className="h-6 w-6 text-cyan-400" />
      <span className="font-[family-name:var(--font-display)] text-[0.95rem] font-bold tracking-[0.2em] text-fg">AI SEEKHO</span>
    </span>
  );
}
