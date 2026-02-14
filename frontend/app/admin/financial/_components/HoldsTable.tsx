import type { SettlementHold } from "../../../../types/adminDashboard";
import StatusPill from "../../_components/StatusPill";

type HoldsTableProps = {
  holds: SettlementHold[];
};

function scopeLabel(hold: SettlementHold) {
  const scope = hold.scope || {};
  if (scope.orderId) return `Order ${scope.orderId}`;
  if (scope.paymentId) return `Payment ${scope.paymentId}`;
  if (scope.payoutId) return `Payout ${scope.payoutId}`;
  if (scope.supplierId) return `Supplier ${scope.supplierId}`;
  return "Unscoped";
}

function statusTone(status: SettlementHold["status"]) {
  if (status === "ACTIVE") return "amber" as const;
  if (status === "OVERRIDDEN") return "green" as const;
  return "slate" as const;
}

export default function HoldsTable({ holds }: HoldsTableProps) {
  if (!holds.length) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
        No settlement holds found.
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600">
          <tr>
            <th className="px-3 py-2">Hold ID</th>
            <th className="px-3 py-2">Scope</th>
            <th className="px-3 py-2">Subsystem</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Reason</th>
            <th className="px-3 py-2">Created</th>
          </tr>
        </thead>
        <tbody>
          {holds.map((hold) => (
            <tr key={hold.holdId} className="border-t border-slate-100">
              <td className="px-3 py-2 font-mono text-xs text-slate-700">{hold.holdId}</td>
              <td className="px-3 py-2 text-slate-700">{scopeLabel(hold)}</td>
              <td className="px-3 py-2 text-slate-700">{hold.subsystem}</td>
              <td className="px-3 py-2">
                <StatusPill label={hold.status} tone={statusTone(hold.status)} />
              </td>
              <td className="px-3 py-2 text-slate-700">{hold.reason}</td>
              <td className="px-3 py-2 text-slate-700">{new Date(hold.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
