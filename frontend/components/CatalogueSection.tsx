import Link from "next/link";
import { latestCatalogueManifest } from "../data/catalogueManifest";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-AU", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export default function CatalogueSection() {
  const hashLabel = latestCatalogueManifest.hash.replace("sha256:", "");
  const hashShort = `${hashLabel.slice(0, 10)}…${hashLabel.slice(-6)}`;

  return (
    <section className="max-w-6xl mx-auto px-6 py-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Catalogue Week {latestCatalogueManifest.weekId}</h2>
          <p className="text-sm text-muted">
            Locked marketplace catalogue with hash-sealed pricing and placements.
          </p>
        </div>
        <Link href="/catalogue" className="text-sm text-brand-700 font-semibold">
          View catalogue downloads
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface rounded-2xl shadow-card border p-4 space-y-1">
          <div className="text-xs uppercase tracking-wide text-brand-700">Manifest Hash</div>
          <div className="text-base font-semibold break-all">{hashShort}</div>
          <div className="text-xs text-muted">Published {formatDate(latestCatalogueManifest.publishedAt)}</div>
        </div>
        <div className="bg-surface rounded-2xl shadow-card border p-4 space-y-1">
          <div className="text-xs uppercase tracking-wide text-brand-700">Catalogue Coverage</div>
          <div className="text-base font-semibold">
            {latestCatalogueManifest.itemCount} products · {latestCatalogueManifest.sectionCount} sections
          </div>
          <div className="text-xs text-muted">DDP-aligned, compliance-verified listings.</div>
        </div>
        <div className="bg-surface rounded-2xl shadow-card border p-4 space-y-2">
          <div className="text-xs uppercase tracking-wide text-brand-700">Quick Downloads</div>
          <div className="flex flex-wrap gap-2">
            {latestCatalogueManifest.downloads.slice(0, 2).map((download) => (
              <Link
                key={download.format}
                href={download.href}
                className="px-3 py-2 rounded-full bg-brand-700 text-brand-100 text-xs font-semibold"
              >
                {download.format} download
              </Link>
            ))}
          </div>
          <div className="text-xs text-muted">Full exports available on the catalogue page.</div>
        </div>
      </div>
    </section>
  );
}
