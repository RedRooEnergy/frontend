const auditEvents = [
  { ts: "2026-01-24T10:12Z", actor: "USR-7821", action: "Order Read", outcome: "Allowed", domain: "Identity" },
  { ts: "2026-01-24T10:05Z", actor: "USR-2231", action: "Price Mutation", outcome: "Blocked", domain: "Pricing" },
  { ts: "2026-01-24T09:58Z", actor: "EXT-06", action: "Audit Write", outcome: "Allowed", domain: "Audit" },
];

export default function AdminAuditPage() {
  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold">Audit Log (Read-Only)</h2>
        <p className="text-slate-400 text-sm">Entries are append-only and immutable. No edit controls are provided.</p>
      </header>
      <div className="overflow-auto rounded border border-slate-800">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900 text-slate-200">
            <tr>
              <th className="px-4 py-2 text-left">Timestamp</th>
              <th className="px-4 py-2 text-left">Actor</th>
              <th className="px-4 py-2 text-left">Action</th>
              <th className="px-4 py-2 text-left">Outcome</th>
              <th className="px-4 py-2 text-left">Domain</th>
            </tr>
          </thead>
          <tbody>
            {auditEvents.map((event, idx) => (
              <tr key={idx} className="border-t border-slate-800">
                <td className="px-4 py-2">{event.ts}</td>
                <td className="px-4 py-2">{event.actor}</td>
                <td className="px-4 py-2">{event.action}</td>
                <td className="px-4 py-2">{event.outcome}</td>
                <td className="px-4 py-2">{event.domain}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
