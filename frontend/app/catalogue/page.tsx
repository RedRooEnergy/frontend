"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { latestCatalogueManifest } from "../../data/catalogueManifest";
import { getSession, setSession } from "../../lib/store";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-AU", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export default function CatalogueLandingPage() {
  const hashLabel = latestCatalogueManifest.hash.replace("sha256:", "");
  const hashShort = `${hashLabel.slice(0, 12)}…${hashLabel.slice(-6)}`;
  const router = useRouter();
  const session = getSession();
  const catalogueAllowed = session?.role === "buyer";

  const handleGuestBuyer = () => {
    setSession({
      role: "buyer",
      userId: "guest-buyer",
      email: "guest-buyer@redrooenergy.local",
    });
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-surface-muted text-strong">
      <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        <section className="bg-surface rounded-3xl shadow-card border p-8 space-y-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-brand-700 font-semibold">Product Catalogue</p>
            <h1 className="text-3xl font-bold">Weekly Catalogue Access</h1>
            <p className="text-base text-muted">
              Download the current RedRooEnergy catalogue with pricing, placements, and compliance visibility locked
              for the active catalogue period.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-brand-50 border border-brand-100 rounded-2xl p-4">
              <div className="text-xs uppercase tracking-wide text-brand-700">Catalogue Week</div>
              <div className="text-lg font-semibold">{latestCatalogueManifest.weekId}</div>
              <div className="text-xs text-muted mt-1">ISO week reference (YYYY-WW).</div>
            </div>
            <div className="bg-brand-50 border border-brand-100 rounded-2xl p-4">
              <div className="text-xs uppercase tracking-wide text-brand-700">Manifest Hash</div>
              <div className="text-lg font-semibold break-all">{hashShort}</div>
              <div className="text-xs text-muted mt-1">Hash-sealed, audit ready.</div>
            </div>
            <div className="bg-brand-50 border border-brand-100 rounded-2xl p-4">
              <div className="text-xs uppercase tracking-wide text-brand-700">Published</div>
              <div className="text-lg font-semibold">{formatDate(latestCatalogueManifest.publishedAt)}</div>
              <div className="text-xs text-muted mt-1">
                {latestCatalogueManifest.itemCount} products · {latestCatalogueManifest.sectionCount} sections
              </div>
            </div>
          </div>
          <div className="text-xs text-muted">
            Pricing and placements are valid only for the catalogue week shown above. Mid-cycle changes are not
            permitted.
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-xl font-semibold">Catalogue Downloads</h2>
              <p className="text-sm text-muted">Select a format appropriate for your role or procurement workflow.</p>
            </div>
            <Link
              href="/product-catalogue-overview"
              className="text-sm text-brand-700 font-semibold"
            >
              Catalogue governance overview
            </Link>
          </div>
          {catalogueAllowed ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {latestCatalogueManifest.downloads.map((download) => (
                <div key={download.format} className="bg-surface rounded-2xl shadow-card border p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-semibold">{download.title}</div>
                    <span className="text-xs uppercase tracking-wide bg-brand-100 text-brand-700 px-2 py-1 rounded-full">
                      {download.format}
                    </span>
                  </div>
                  <p className="text-sm text-muted">{download.description}</p>
                  <Link
                    href={download.href}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-brand-700 text-brand-100 text-sm font-semibold"
                  >
                    Download
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-surface rounded-2xl shadow-card border p-5 text-sm text-muted">
              Catalogue downloads require a buyer session. Sign in as a buyer or continue as a guest buyer to access
              the full catalogue.
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleGuestBuyer}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-brand-700 text-brand-100 text-sm font-semibold"
                >
                  Continue as guest buyer
                </button>
                <Link
                  href="/signin?role=buyer"
                  className="inline-flex items-center justify-center px-4 py-2 rounded-full border border-brand-200 text-sm font-semibold text-brand-700"
                >
                  Sign in as buyer
                </Link>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
