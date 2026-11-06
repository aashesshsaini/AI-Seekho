import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="eyebrow">404</p>
      <h1 className="display-lg mt-4 text-fg">Yeh page nahi mila.</h1>
      <p className="mt-4 max-w-md text-fg-muted">Link galat ho sakta hai, ya page hata diya gaya ho.</p>
      <div className="mt-8 flex gap-3">
        <Link href="/" className="rounded-xl bg-cyan-400 px-5 py-2.5 font-semibold text-ink-950">Home</Link>
        <Link href="/learn" className="rounded-xl border border-line-strong px-5 py-2.5 font-semibold text-fg">Learn AI</Link>
      </div>
    </main>
  );
}
