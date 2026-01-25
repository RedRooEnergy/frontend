const productSummary = { active: 8, pending: 3, rejected: 1 };
const orderSummary = { awaiting: 2, inProgress: 4, completed: 12 };
const complianceSummary = { status: "Pending Verification", alerts: 2 };
const alerts = [
  { id: "AL-01", type: "Rejection", message: "Product PRD-442 rejected: missing compliance certificate." },
  { id: "AL-02", type: "Missing Doc", message: "Upload safety datasheet for PRD-450 before approval." },
];

export default function SupplierDashboardPage() {
  return (
    <div className="space-y-10">
      <section className="grid md:grid-cols-3 gap-4">
        <SummaryCard title="Products" value={`${productSummary.active} active`} hint={`${productSummary.pending} pending / ${productSummary.rejected} rejected`} />
        <SummaryCard title="Orders" value={`${orderSummary.inProgress} in progress`} hint={`${orderSummary.awaiting} awaiting / ${orderSummary.completed} completed`} />
        <SummaryCard title="Compliance" value={complianceSummary.status} hint={`${complianceSummary.alerts} alerts`} />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Enforcement Alerts</h2>
          <p className="text-slate-400 text-sm">Alerts come from backend enforcement; UI cannot override outcomes.</p>
        </div>
        <ul className="space-y-2">
          {alerts.map((alert) => (
            <li key={alert.id} className="rounded border border-slate-800 p-3">
              <p className="text-emerald-300 text-sm uppercase tracking-wide">{alert.type}</p>
              <p className="text-slate-200">{alert.message}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function SummaryCard({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-emerald-400/40 bg-emerald-400/5 p-4 space-y-1">
      <p className="text-slate-300 text-sm">{title}</p>
      <p className="text-2xl font-semibold text-emerald-200">{value}</p>
      {hint && <p className="text-slate-400 text-xs">{hint}</p>}
    </div>
  );
}
