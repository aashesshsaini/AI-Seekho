"use client";

export default function SiteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container-page flex min-h-[50vh] flex-col items-start justify-center py-20">
      <p className="eyebrow">Error</p>
      <h1 className="display-md mt-4 text-fg">Kuch galat ho gaya.</h1>
      <p className="mt-3 max-w-md text-fg-muted">Page load nahi ho paaya. Kripya dobara try kariye.</p>
      <button type="button" onClick={reset} className="mt-8 rounded-xl bg-cyan-400 px-5 py-2.5 font-semibold text-ink-950">
        Try again
      </button>
    </div>
  );
}
