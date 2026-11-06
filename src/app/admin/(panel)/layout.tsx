import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/ui";
import { getCurrentAdmin } from "@/lib/auth/session";
import { isDbConfigured } from "@/lib/env";

/**
 * Admin shell. The session is verified server-side here AND again inside
 * every page and server action (layouts are not a security boundary).
 */
export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="p-10 text-sm text-fg-subtle">Loading…</div>}>
      <Guard>{children}</Guard>
    </Suspense>
  );
}

async function Guard({ children }: { children: React.ReactNode }) {
  if (!isDbConfigured()) redirect("/admin/login");
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  return <AdminShell admin={admin}>{children}</AdminShell>;
}
