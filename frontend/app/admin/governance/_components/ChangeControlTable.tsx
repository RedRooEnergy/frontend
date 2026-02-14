import type { ChangeControlEvent } from "../../../../types/adminDashboard";
import StatusPill from "../../_components/StatusPill";

type ChangeControlTableProps = {
  items: ChangeControlEvent[];
};

function tone(status: ChangeControlEvent["status"]) {
  if (status === "SUBMITTED") return "amber" as const;
  if (status === "APPROVED" || status === "IMPLEMENTED") return "green" as const;
  return "red" as const;
}

export default function ChangeControlTable({ items }: ChangeControlTableProps) {
  if (!items.length) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
        No change control events found.
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600">
          <tr>
            <th className="px-3 py-2">ID</th>
            <th className="px-3 py-2">Type</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Reason</th>
            <th className="px-3 py-2">Rationale</th>
            <th className="px-3 py-2">Created</th>
            <th className="px-3 py-2">Audit</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.changeControlId} className="border-t border-slate-100">
              <td className="px-3 py-2 font-mono text-xs text-slate-700">{item.changeControlId}</td>
              <td className="px-3 py-2 text-slate-700">{item.type}</td>
              <td className="px-3 py-2">
                <StatusPill label={item.status} tone={tone(item.status)} />
              </td>
              <td className="px-3 py-2 text-slate-700">{item.reason}</td>
              <td className="px-3 py-2 text-slate-700">{item.rationale}</td>
              <td className="px-3 py-2 text-slate-700">{new Date(item.createdAt).toLocaleString()}</td>
              <td className="px-3 py-2 font-mono text-xs text-slate-700">{item.auditId}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
