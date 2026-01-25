const complianceItems = [
  { id: "C-1001", name: "Safety Datasheet", status: "Pending" },
  { id: "C-0998", name: "Certification", status: "Verified" },
  { id: "C-0990", name: "Insurance Proof", status: "Rejected" },
];

export default function SupplierCompliancePage() {
  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold">Compliance</h2>
        <p className="text-slate-400 text-sm">
          Uploading documents does not imply approval. Status is enforced by backend compliance checks.
        </p>
      </header>
      <ul className="space-y-2">
        {complianceItems.map((item) => (
          <li key={item.id} className="flex items-center justify-between rounded border border-slate-800 p-3">
            <div>
              <p className="text-slate-200">{item.name}</p>
              <p className="text-slate-400 text-sm">{item.status}</p>
            </div>
            <div className="flex gap-2">
              <button className="rounded border border-slate-700 px-3 py-2 text-slate-300 opacity-70">
                Upload Update
              </button>
              <span className="text-slate-400 text-xs">Approval is determined server-side</span>
            </div>
          </li>
        ))}
      </ul>
      <p className="text-slate-400 text-xs">
        Rejections and pending states are controlled by backend enforcement; UI surfaces reasons and status only.
      </p>
    </section>
  );
}
