import Link from "next/link";
import { listPublishedParticipants, mapEntityPathToType } from "../../lib/public-sites/services/PublicSiteService";

export default function PublicDirectoryPage({
  entityType,
  title,
  routePrefix,
}: {
  entityType: string;
  title: string;
  routePrefix: string;
}) {
  const rows = listPublishedParticipants(mapEntityPathToType(entityType)) as Array<{
    entityId: string;
    entityType: string;
    slug: string;
    snapshotVersion: number;
    seoMeta: { title?: string; description?: string } | undefined;
  }>;

  return (
    <section className="mx-auto max-w-5xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-sm text-slate-500">Published participants only. Suspended/revoked entities are excluded.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((row) => (
          <article key={`${row.entityType}:${row.entityId}:${row.slug}`} className="rounded-2xl border p-4">
            <h2 className="text-lg font-medium">{row.seoMeta?.title || row.slug}</h2>
            <p className="mt-1 text-sm text-slate-500">{row.seoMeta?.description || "No description available."}</p>
            <div className="mt-3 text-xs text-slate-600">Snapshot v{row.snapshotVersion}</div>
            <Link href={`${routePrefix}/${row.slug}`} className="mt-3 inline-block rounded border px-3 py-1 text-sm font-semibold">
              View profile
            </Link>
          </article>
        ))}
      </div>

      {!rows.length ? <p className="text-sm text-slate-500">No published participants.</p> : null}
    </section>
  );
}
