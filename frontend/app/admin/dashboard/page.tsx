const enforcementDomains = [
  { name: "Identity & Roles", enabled: true },
  { name: "Pricing Snapshot Integrity", enabled: true },
  { name: "Audit Immutability", enabled: true },
  { name: "Extension Boundary", enabled: true },
];

const alerts = [
  { id: "AL-201", type: "Boundary", message: "EXT-06 blocked attempt to bypass pricing snapshot." },
  { id: "AL-198", type: "Compliance", message: "3 shipments waiting compliance evidence." },
];

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <section className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {enforcementDomains.map((domain) => (
          <div key={domain.name} className="rounded-lg border border-emerald-400/40 bg-emerald-400/5 p-4">
            <p className="text-slate-300 text-sm">{domain.name}</p>
            <p className="text-emerald-200 text-2xl font-semibold">{domain.enabled ? "ON" : "OFF"}</p>
            <p className="text-slate-400 text-xs">Read-only indicator; toggles live in ops config.</p>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Recent Enforcement Blocks (24h)</h2>
          <span className="text-slate-400 text-sm">Data is read-only; no override available.</span>
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
