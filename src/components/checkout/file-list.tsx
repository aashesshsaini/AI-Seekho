import { Download, FileArchive, FileText } from "lucide-react";

export type DownloadFile = { id: string; label: string; filename: string; sizeBytes: number; contentType: string; href: string };

function mb(n: number) {
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function FileList({ files }: { files: DownloadFile[] }) {
  if (files.length === 0) {
    return <p className="text-fg-muted">Files abhi attach nahi hui hain. Kripya support se contact kariye.</p>;
  }
  const hasZip = files.some((f) => f.contentType === "application/zip");
  return (
    <>
    <ul className="space-y-3">
      {files.map((f, i) => {
        const Icon = f.contentType === "application/zip" ? FileArchive : FileText;
        return (
          <li key={f.id} className={i === 0 ? "surface border-cyan-400/30 p-1" : "surface p-1"}>
            <a href={f.href} rel="nofollow noreferrer" className="flex items-center gap-4 rounded-[calc(var(--radius-card)-4px)] p-4 transition-colors hover:bg-white/[0.04]">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10">
                <Icon className="h-5 w-5 text-cyan-400" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-fg">{f.label}</span>
                <span className="block truncate text-xs text-fg-subtle">{f.filename} · {mb(f.sizeBytes)}</span>
              </span>
              <Download className="h-5 w-5 shrink-0 text-fg-muted" aria-hidden />
              <span className="sr-only">Download {f.label}</span>
            </a>
          </li>
        );
      })}
    </ul>
    {hasZip && (
      <p className="mt-4 text-sm text-fg-subtle">
        Internet slow hai? Badi ZIP file ki jagah PDFs ek-ek karke download kariye — har file chhoti hai aur jaldi poori hoti hai. Download beech mein
        ruk jaye toh page refresh karke dobara try kariye.
      </p>
    )}
    </>
  );
}
