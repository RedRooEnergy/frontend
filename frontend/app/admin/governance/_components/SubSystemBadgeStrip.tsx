import type { GovernanceCheck } from "../../../../types/adminDashboard";
import StatusPill from "../../_components/StatusPill";

type SubSystemBadgeStripProps = {
  checks: GovernanceCheck[];
};

function toneForStatus(status: GovernanceCheck["status"]) {
  if (status === "PASS") return "green" as const;
  if (status === "FAIL") return "red" as const;
  return "amber" as const;
}

export default function SubSystemBadgeStrip({ checks }: SubSystemBadgeStripProps) {
  if (!checks.length) {
    return <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">No governance checks returned.</div>;
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">Rule Status Strip</h3>
      <div className="flex flex-wrap gap-2">
        {checks.map((check) => (
          <div key={check.id} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1">
            <span className="text-xs font-medium text-slate-700">{check.id}</span>
            <StatusPill label={check.status} tone={toneForStatus(check.status)} />
          </div>
        ))}
      </div>
    </section>
  );
}
