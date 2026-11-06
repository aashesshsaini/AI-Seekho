import { Suspense } from "react";
import { Logo } from "@/components/ui";
import { isDbConfigured } from "@/lib/env";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Logo />
        <h1 className="mt-8 text-2xl font-semibold text-fg">Admin sign in</h1>
        <p className="mt-2 text-sm text-fg-muted">Sirf authorised AI SEEKHO team ke liye.</p>
        {isDbConfigured() ? (
          <Suspense>
            <LoginForm />
          </Suspense>
        ) : (
          <p className="mt-6 rounded-xl border border-warning/30 bg-warning/[0.06] p-4 text-sm text-fg-muted">
            Database configure nahi hai. <code>MONGODB_URI</code> set kariye aur <code>npm run admin:create</code> se pehla admin banaiye.
          </p>
        )}
      </div>
    </main>
  );
}
