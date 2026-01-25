const complianceQueue = [
  { id: "CMP-301", supplier: "SUP-1201", status: "Pending", item: "Safety Datasheet" },
  { id: "CMP-292", supplier: "SUP-1198", status: "Verified", item: "Certification" },
  { id: "CMP-285", supplier: "SUP-1189", status: "Rejected", item: "Insurance Proof" },
];

export default function AdminCompliancePage() {
  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold">Compliance Queue (Read-Only)</h2>
        <p className="text-slate-400 text-sm">Evidence is visible for review; approvals are governed by enforcement.</p>
      </header>
      <div className="overflow-auto rounded border border-slate-800">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900 text-slate-200">
            <tr>
              <th className="px-4 py-2 text-left">Case ID</th>
              <th className="px-4 py-2 text-left">Supplier</th>
              <th className="px-4 py-2 text-left">Item</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {complianceQueue.map((c) => (
              <tr key={c.id} className="border-t border-slate-800">
                <td className="px-4 py-2">{c.id}</td>
                <td className="px-4 py-2">{c.supplier}</td>
                <td className="px-4 py-2">{c.item}</td>
                <td className="px-4 py-2">{c.status}</td>
                <td className="px-4 py-2 text-slate-400 text-xs">Escalation follows governed process</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-slate-400 text-xs">No approval controls here; enforcement determines outcomes.</p>
    </section>
  );
}
