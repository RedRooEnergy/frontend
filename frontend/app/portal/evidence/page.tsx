import { getServerActor } from "../../../lib/auth/serverActor";
import { hasPortalAccess } from "../../../lib/portal/config";
import { buildEvidenceIndex } from "../../../lib/portal/evidence";
import { appendPortalAccessAudit } from "../../../lib/rbac/audit";

export default function PortalEvidencePage() {
  const actor = getServerActor();
  if (!actor || !hasPortalAccess(actor.roles)) {
    return (
      <section className="rounded border border-red-800 bg-red-950/30 p-4">
        <h2 className="text-lg font-semibold">401 Unauthorized</h2>
        <p className="text-sm text-red-200">Authentication is required to access governance evidence.</p>
      </section>
    );
  }

  const index = buildEvidenceIndex();
  appendPortalAccessAudit({
    actorUserId: actor.userId,
    actorRole: actor.role,
    actorEmail: actor.email,
    path: "/portal/evidence",
    outcome: "ALLOW",
    reason: "Portal evidence page access granted",
  });

  return (
    <section className="space-y-6">
      <div className="rounded border border-slate-800 bg-slate-900 p-4">
        <h2 className="text-xl font-semibold">Governance Evidence Index</h2>
        <p className="text-xs text-slate-400">
          Immutable evidence registry for audits, summaries, and hash verification references.
        </p>
      </div>

      <div className="rounded border border-slate-800 bg-slate-900 p-4">
        <h3 className="text-sm font-semibold mb-2">Snapshot metadata</h3>
        <p className="text-xs text-slate-400">Generated: {index.generatedAtUtc}</p>
        <p className="text-xs text-slate-400">Repo root: {index.repoRoot}</p>
      </div>

      <div className="rounded border border-slate-800 bg-slate-900 p-4">
        <h3 className="text-sm font-semibold mb-3">Release tags</h3>
        <div className="space-y-2">
          {Object.entries(index.tags).map(([tag, commit]) => (
            <div key={tag} className="flex items-center justify-between rounded border border-slate-800 bg-slate-950 px-3 py-2 text-xs">
              <span className="font-mono text-slate-200">{tag}</span>
              <span className="font-mono text-slate-400">{commit || "MISSING"}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {index.evidence.map((item) => (
          <article key={item.key} className="rounded border border-slate-800 bg-slate-900 p-4 space-y-2">
            <h4 className="text-sm font-semibold">{item.label}</h4>
            <p className="text-xs text-slate-400">Directory: {item.directory}</p>
            <p className="text-xs text-slate-400">Updated: {item.updatedAtUtc || "No artefacts found"}</p>
            <p className="text-xs text-slate-300">Scorecard: {item.latestScorecardPath || "n/a"}</p>
            <p className="text-xs text-slate-300">Summary PDF: {item.latestPdfPath || "n/a"}</p>
            <p className="text-xs text-slate-300">SHA file: {item.latestShaPath || "n/a"}</p>
            <p className="text-xs text-slate-300">SHA-256: {item.latestPdfSha256 || "n/a"}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
