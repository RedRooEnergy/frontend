"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { latestCatalogueManifest } from "../../../data/catalogueManifest";
import { getSession, setSession } from "../../../lib/store";

interface CatalogueDownloadPageProps {
  searchParams?: { format?: string };
}

export default function CatalogueDownloadPage({ searchParams }: CatalogueDownloadPageProps) {
  const format = (searchParams?.format || "pdf").toUpperCase();
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
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-6">
        {catalogueAllowed ? (
          <div className="bg-surface rounded-3xl shadow-card border p-8 space-y-3">
            <p className="text-xs uppercase tracking-wide text-brand-700 font-semibold">Catalogue Download</p>
            <h1 className="text-2xl font-bold">Preparing {format} Export</h1>
            <p className="text-sm text-muted">
              Downloads are generated from the locked catalogue manifest for week {latestCatalogueManifest.weekId}.
              This prototype view confirms the request and references the manifest hash.
            </p>
            <div className="text-sm text-muted">
              Manifest hash: <span className="font-semibold text-strong">{latestCatalogueManifest.hash}</span>
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link href="/catalogue" className="px-4 py-2 rounded-full bg-brand-700 text-brand-100 text-sm font-semibold">
                Back to catalogue
              </Link>
              <Link
                href="/product-catalogue-overview"
                className="px-4 py-2 rounded-full border border-brand-200 text-sm font-semibold text-brand-700"
              >
                Catalogue governance
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-surface rounded-3xl shadow-card border p-8 space-y-3 text-sm text-muted">
            <p className="text-xs uppercase tracking-wide text-brand-700 font-semibold">Catalogue Download</p>
            <h1 className="text-2xl font-bold text-strong">Buyer or guest access required</h1>
            <p>Catalogue downloads require a buyer session. Continue as a guest buyer or sign in with a buyer account.</p>
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={handleGuestBuyer}
                className="px-4 py-2 rounded-full bg-brand-700 text-brand-100 text-sm font-semibold"
              >
                Continue as guest buyer
              </button>
              <Link
                href="/signin?role=buyer"
                className="px-4 py-2 rounded-full border border-brand-200 text-sm font-semibold text-brand-700"
              >
                Sign in as buyer
              </Link>
              <Link
                href="/catalogue"
                className="px-4 py-2 rounded-full border border-brand-200 text-sm font-semibold text-brand-700"
              >
                Back to catalogue
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
