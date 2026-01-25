const extensions = [
  { id: "EXT-01", name: "Supplier Onboarding", status: "Locked" },
  { id: "EXT-04", name: "Payments & Pricing Snapshot", status: "Enabled (governed)" },
  { id: "EXT-06", name: "Logistics & DDP", status: "Enabled (governed)" },
  { id: "EXT-03", name: "Logistics (Superseded)", status: "Closed (Superseded by EXT-06)" },
  { id: "EXT-27", name: "Analytics & Reporting", status: "Locked (visibility)" },
];

export default function AdminExtensionsPage() {
  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold">Extensions (Read-Only)</h2>
        <p className="text-slate-400 text-sm">No enable/disable controls. Status reflects governed lifecycle only.</p>
      </header>
      <ul className="space-y-2">
        {extensions.map((ext) => (
          <li key={ext.id} className="rounded border border-slate-800 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-200 font-semibold">{ext.name}</p>
                <p className="text-slate-400 text-sm">{ext.id}</p>
              </div>
              <span className="text-emerald-300 text-sm">{ext.status}</span>
            </div>
            {ext.id === "EXT-03" && (
              <p className="text-slate-400 text-xs mt-1">Superseded by EXT-06; remains closed.</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
