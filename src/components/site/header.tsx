"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Menu, X } from "lucide-react";
import { ButtonLink, Logo } from "@/components/ui";

const NAV = [
  { href: "/learn", label: "Learn AI" },
  { href: "/tools", label: "AI Tools" },
  { href: "/products/ai-se-smart-kaam", label: "Playbook" },
  { href: "/services", label: "Services" },
  { href: "/about", label: "About" },
];

function DesktopLinks({ pathname }: { pathname: string | null }) {
  return (
    <ul className="flex items-center gap-1">
      {NAV.map((item) => {
        const active = pathname !== null && (pathname === item.href || pathname.startsWith(item.href + "/"));
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={clsx("rounded-lg px-3.5 py-2 text-sm font-medium transition-colors", active ? "text-fg" : "text-fg-muted hover:text-fg")}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function ActiveDesktopLinks() {
  return <DesktopLinks pathname={usePathname()} />;
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    menuRef.current?.querySelector<HTMLElement>("a")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={clsx(
        "sticky top-0 z-50 h-[var(--header-h)] transition-[background,border-color,backdrop-filter] duration-300",
        scrolled || open ? "border-b border-line bg-ink-900/80 backdrop-blur-xl" : "border-b border-transparent",
      )}
    >
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-cyan-400 focus:px-3 focus:py-2 focus:text-ink-950">
        Skip to content
      </a>
      <div className="container-page flex h-full items-center justify-between gap-6">
        <Link href="/" aria-label="AI SEEKHO home" className="shrink-0">
          <Logo />
        </Link>

        <nav aria-label="Primary" className="hidden lg:block">
          <Suspense fallback={<DesktopLinks pathname={null} />}>
            <ActiveDesktopLinks />
          </Suspense>
        </nav>

        <div className="flex items-center gap-2">
          <ButtonLink href="/products/ai-se-smart-kaam" size="sm" className="hidden sm:inline-flex">
            Get the Playbook
          </ButtonLink>
          <button
            ref={toggleRef}
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-fg hover:bg-white/[0.06] lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div
        id="mobile-menu"
        ref={menuRef}
        hidden={!open}
        className="fixed inset-x-0 bottom-0 top-[var(--header-h)] z-40 overflow-y-auto bg-ink-900/98 backdrop-blur-xl lg:hidden"
      >
        <nav aria-label="Mobile" className="container-page py-6">
          <ul className="divide-y divide-line">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} onClick={() => setOpen(false)} className="block py-4 text-lg font-medium text-fg">
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/contact" onClick={() => setOpen(false)} className="block py-4 text-lg font-medium text-fg">
                Contact
              </Link>
            </li>
          </ul>
          <ButtonLink href="/products/ai-se-smart-kaam" size="lg" className="mt-6 w-full" onClick={() => setOpen(false)}>
            Get the Playbook
          </ButtonLink>
        </nav>
      </div>
    </header>
  );
}
