import type { GovernanceStatusResponse } from "../../../../types/adminDashboard";
import StatusPill from "../../_components/StatusPill";

type GovernanceStatusMatrixProps = {
  status: GovernanceStatusResponse;
};

function toneFromStatus(status: "PASS" | "FAIL" | "NO_DATA") {
  if (status === "PASS") return "green" as const;
  if (status === "FAIL") return "red" as const;
  return "amber" as const;
}

export default function GovernanceStatusMatrix({ status }: GovernanceStatusMatrixProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600">
          <tr>
            <th className="px-3 py-2">Rule</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Severity</th>
            <th className="px-3 py-2">Impact Surface</th>
            <th className="px-3 py-2">Notes</th>
          </tr>
        </thead>
        <tbody>
          {status.governanceChecks.map((check) => (
            <tr key={check.id} className="border-t border-slate-100">
              <td className="px-3 py-2 font-mono text-xs text-slate-700">{check.id}</td>
              <td className="px-3 py-2">
                <StatusPill label={check.status} tone={toneFromStatus(check.status)} />
              </td>
              <td className="px-3 py-2 text-slate-700">{check.severity || "N/A"}</td>
              <td className="px-3 py-2 text-slate-700">{check.impactSurface || "N/A"}</td>
              <td className="px-3 py-2 text-xs text-slate-700">{check.notes?.length ? check.notes.join("; ") : "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
