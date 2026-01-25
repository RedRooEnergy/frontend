const products = [
  { id: "PRD-442", name: "Energy Monitor", status: "Rejected", reason: "Missing compliance certificate" },
  { id: "PRD-450", name: "Smart Meter Kit", status: "Pending", reason: "Awaiting safety datasheet" },
  { id: "PRD-430", name: "Solar Connector", status: "Approved", reason: "" },
];

export default function SupplierProductsPage() {
  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold">Products</h2>
        <p className="text-slate-400 text-sm">Statuses are enforced by backend. No force-publish or bypass actions exist.</p>
      </header>
      <div className="overflow-auto rounded border border-slate-800">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900 text-slate-200">
            <tr>
              <th className="px-4 py-2 text-left">Product</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Details</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-t border-slate-800">
                <td className="px-4 py-2">
                  <div className="font-semibold text-slate-200">{product.name}</div>
                  <div className="text-slate-400 text-xs">{product.id}</div>
                </td>
                <td className="px-4 py-2">{product.status}</td>
                <td className="px-4 py-2 text-slate-300">{product.reason || "—"}</td>
                <td className="px-4 py-2">
                  <button className="rounded border border-slate-700 px-3 py-2 text-slate-300 opacity-70" disabled>
                    Controlled by backend
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-slate-400 text-xs">
        Uploading documents or changes does not imply approval. Backend enforcement determines status.
      </p>
    </section>
  );
}
