import Link from "next/link";
import clsx from "clsx";
import type { ReactNode } from "react";
import { LayoutDashboard, Package, Receipt, FileText, Wrench, Briefcase, Inbox, Settings, ScrollText, LogOut } from "lucide-react";
import { Logo } from "@/components/ui";
import type { AdminIdentity } from "@/lib/auth/session";
import { logoutAction } from "@/app/admin/actions";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, role: "editor" },
  { href: "/admin/orders", label: "Orders", icon: Receipt, role: "owner" },
  { href: "/admin/products", label: "Products", icon: Package, role: "owner" },
  { href: "/admin/content/tutorials", label: "Tutorials", icon: FileText, role: "editor" },
  { href: "/admin/content/tools", label: "AI Tools", icon: Wrench, role: "editor" },
  { href: "/admin/content/services", label: "Services", icon: Briefcase, role: "editor" },
  { href: "/admin/enquiries", label: "Enquiries", icon: Inbox, role: "editor" },
  { href: "/admin/settings", label: "Settings", icon: Settings, role: "owner" },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText, role: "owner" },
] as const;

export function AdminShell({ admin, children }: { admin: AdminIdentity; children: ReactNode }) {
  const items = NAV.filter((n) => n.role === "editor" || admin.role === "owner");
  return (
    <div className="lg:grid lg:min-h-dvh lg:grid-cols-[240px_1fr]">
      <aside className="border-b border-line bg-ink-900 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-5 py-5">
          <Link href="/admin" aria-label="Admin home">
            <Logo />
          </Link>
        </div>
        <nav aria-label="Admin" className="overflow-x-auto px-3 pb-3 lg:pb-6">
          <ul className="flex gap-1 lg:flex-col">
            {items.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm text-fg-muted hover:bg-white/5 hover:text-fg">
                  <n.icon className="h-4 w-4" aria-hidden /> {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="hidden border-t border-line px-5 py-4 text-xs text-fg-subtle lg:block">
          <p className="truncate text-fg-muted">{admin.name}</p>
          <p className="truncate">{admin.email} · {admin.role}</p>
          <form action={logoutAction} className="mt-3">
            <button className="inline-flex items-center gap-1.5 text-fg-muted hover:text-fg">
              <LogOut className="h-3.5 w-3.5" aria-hidden /> Sign out
            </button>
          </form>
        </div>
      </aside>
      <div className="min-w-0 px-4 py-8 md:px-10">{children}</div>
    </div>
  );
}

export function PageTitle({ title, action, children }: { title: string; action?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-fg">{title}</h1>
        {children && <p className="mt-1 text-sm text-fg-muted">{children}</p>}
      </div>
      {action}
    </div>
  );
}

export function Flash({ params }: { params: Record<string, string | string[] | undefined> }) {
  const error = typeof params.error === "string" ? params.error : "";
  if (error) return <p role="alert" className="mb-6 rounded-lg border border-danger/30 bg-danger/[0.07] px-4 py-2.5 text-sm text-danger">{error}</p>;
  if (params.saved) return <p role="status" className="mb-6 rounded-lg border border-success/30 bg-success/[0.07] px-4 py-2.5 text-sm text-success">Saved.</p>;
  if (params.denied) return <p role="alert" className="mb-6 rounded-lg border border-warning/30 bg-warning/[0.07] px-4 py-2.5 text-sm text-warning">Is section ke liye owner role chahiye.</p>;
  return null;
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-white/[0.03] text-xs uppercase tracking-wider text-fg-subtle">
          <tr>{head.map((h) => <th key={h} scope="col" className="px-4 py-3 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={clsx("px-4 py-3 align-top text-fg-muted", className)}>{children}</td>;
}

export function StatusPill({ status }: { status: string }) {
  const tone: Record<string, string> = {
    paid: "bg-success/15 text-success",
    published: "bg-success/15 text-success",
    created: "bg-white/10 text-fg-muted",
    authorized: "bg-warning/15 text-warning",
    failed: "bg-danger/15 text-danger",
    review: "bg-warning/15 text-warning",
    refunded: "bg-violet-400/15 text-violet-400",
    draft: "bg-white/10 text-fg-muted",
    new: "bg-cyan-400/15 text-cyan-300",
    in_progress: "bg-warning/15 text-warning",
    closed: "bg-white/10 text-fg-muted",
    spam: "bg-danger/15 text-danger",
  };
  return <span className={clsx("inline-block rounded-full px-2 py-0.5 text-xs font-medium", tone[status] ?? "bg-white/10 text-fg-muted")}>{status}</span>;
}

export function DbMissing() {
  return (
    <div className="rounded-xl border border-warning/30 bg-warning/[0.06] p-6 text-sm text-fg-muted">
      Database configure nahi hai. <code>MONGODB_URI</code> set kariye.
    </div>
  );
}

export const adminInput =
  "block w-full rounded-lg border border-line-strong bg-ink-900 px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:border-cyan-400/70 focus:outline-none focus:ring-2 focus:ring-cyan-400/20";

export function AField({ label, name, children, hint }: { label: string; name: string; children: ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="block text-sm font-medium text-fg">{label}</label>
      {children}
      {hint && <p className="text-xs text-fg-subtle">{hint}</p>}
    </div>
  );
}

export function SaveBar({ label = "Save" }: { label?: string }) {
  return (
    <div className="sticky bottom-0 -mx-4 mt-8 border-t border-line bg-ink-950/90 px-4 py-4 backdrop-blur md:-mx-10 md:px-10">
      <button type="submit" className="rounded-lg bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-ink-950 hover:bg-cyan-300">{label}</button>
    </div>
  );
}
