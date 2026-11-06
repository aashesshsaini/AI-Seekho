"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";

/**
 * Consent-gated analytics. Nothing is loaded unless (a) an ID is configured
 * via NEXT_PUBLIC_GA4_ID / NEXT_PUBLIC_META_PIXEL_ID and (b) the visitor
 * explicitly accepts. No personal data is ever sent in events.
 */

const GA_ID = process.env.NEXT_PUBLIC_GA4_ID ?? "";
const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "";
const TRACKING_CONFIGURED = Boolean(GA_ID || PIXEL_ID);
const KEY = "ais_consent_v1";
const OPEN_EVENT = "ais:open-consent";

type Choice = "granted" | "denied" | null;

function readChoice(): Choice {
  try {
    const v = localStorage.getItem(KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function writeChoice(c: Exclude<Choice, null>) {
  try {
    localStorage.setItem(KEY, c);
  } catch {
    /* storage blocked — choice applies to this page view only */
  }
  memoryChoice = c;
  listeners.forEach((l) => l());
}
let memoryChoice: Choice = null;
const getSnapshot = () => readChoice() ?? memoryChoice;
const getServerSnapshot = () => null as Choice;

type W = Window & { dataLayer?: unknown[]; gtag?: (...a: unknown[]) => void; fbq?: ((...a: unknown[]) => void) & { queue?: unknown[]; loaded?: boolean; version?: string; callMethod?: (...a: unknown[]) => void; push?: unknown } };

let loaded = false;
function loadScripts() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  const w = window as W;
  if (GA_ID) {
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
    document.head.appendChild(s);
    w.dataLayer = w.dataLayer || [];
    w.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      w.dataLayer!.push(arguments);
    };
    w.gtag("js", new Date());
    w.gtag("config", GA_ID, { anonymize_ip: true });
  }
  if (PIXEL_ID) {
    const fbq = function (...args: unknown[]) {
      if (fbq.callMethod) fbq.callMethod(...args);
      else fbq.queue!.push(args);
    } as NonNullable<W["fbq"]>;
    fbq.queue = [];
    fbq.loaded = true;
    fbq.version = "2.0";
    fbq.push = fbq;
    w.fbq = fbq;
    const s = document.createElement("script");
    s.async = true;
    s.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(s);
    fbq("init", PIXEL_ID);
    fbq("track", "PageView");
  }
}

const META_MAP: Record<string, string> = { view_item: "ViewContent", begin_checkout: "InitiateCheckout", purchase: "Purchase" };

/** Fire an analytics event. Only non-personal commerce fields are allowed. */
export function trackEvent(
  name: "view_item" | "begin_checkout" | "purchase",
  params: { value?: number; currency?: "INR"; item_id?: string; transaction_id?: string },
) {
  if (!loaded) return;
  const w = window as W;
  w.gtag?.("event", name, params);
  const meta = META_MAP[name];
  if (meta && w.fbq) {
    w.fbq("track", meta, { value: params.value, currency: params.currency, content_ids: params.item_id ? [params.item_id] : undefined }, params.transaction_id ? { eventID: params.transaction_id } : undefined);
  }
}

export function ConsentManager() {
  const choice = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [forceOpen, setForceOpen] = useState(false);

  useEffect(() => {
    if (choice === "granted") loadScripts();
  }, [choice]);

  useEffect(() => {
    const open = () => setForceOpen(true);
    window.addEventListener(OPEN_EVENT, open);
    return () => window.removeEventListener(OPEN_EVENT, open);
  }, []);

  if (!TRACKING_CONFIGURED) return null;
  if (choice !== null && !forceOpen) return null;

  const decide = (c: "granted" | "denied") => {
    writeChoice(c);
    setForceOpen(false);
    if (c === "denied" && loaded) window.location.reload();
  };

  return (
    <div role="dialog" aria-label="Cookie preferences" className="fixed inset-x-3 bottom-3 z-[70] mx-auto max-w-xl rounded-2xl border border-line-strong bg-ink-800/95 p-5 shadow-2xl backdrop-blur-xl sm:bottom-5">
      <p className="text-sm leading-relaxed text-fg-muted">
        Hum website behtar banane ke liye analytics cookies use karna chahte hain (Google Analytics / Meta Pixel). Aapki permission ke bina koi
        tracking load nahi hoti. <Link href="/legal/privacy-policy" className="text-cyan-400 underline">Privacy Policy</Link>
      </p>
      <div className="mt-4 flex gap-2">
        <button type="button" onClick={() => decide("granted")} className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-ink-950 hover:bg-cyan-300">
          Accept
        </button>
        <button type="button" onClick={() => decide("denied")} className="rounded-lg border border-line-strong px-4 py-2 text-sm font-semibold text-fg hover:bg-white/5">
          Reject
        </button>
      </div>
    </div>
  );
}

export function ConsentSettingsLink() {
  if (!TRACKING_CONFIGURED) return null;
  return (
    <button type="button" className="hover:text-fg" onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}>
      Cookie settings
    </button>
  );
}

/** Fires a single event on mount (e.g. view_item on product page). */
export function TrackOnMount(props: Parameters<typeof trackEvent>[1] & { event: Parameters<typeof trackEvent>[0] }) {
  const { event, ...params } = props;
  const choice = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => {
    if (choice !== "granted") return;
    loadScripts();
    const t = setTimeout(() => trackEvent(event, params), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [choice]);
  return null;
}
