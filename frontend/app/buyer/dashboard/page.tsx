const sampleOrders = [
  { id: "ORD-1021", status: "In Progress", locked: true, updated: "2026-01-18" },
  { id: "ORD-1010", status: "Delivered", locked: true, updated: "2026-01-12" },
  { id: "ORD-0998", status: "Awaiting Compliance", locked: false, updated: "2026-01-08" },
];

export default function BuyerDashboardPage() {
  const totals = {
    total: sampleOrders.length,
    inProgress: sampleOrders.filter((o) => o.status === "In Progress").length,
    delivered: sampleOrders.filter((o) => o.status === "Delivered").length,
    documents: 6,
  };

  return (
    <div className="space-y-10">
      <section className="grid md:grid-cols-4 gap-4">
        <SummaryCard title="Total Orders" value={totals.total} />
        <SummaryCard title="In Progress" value={totals.inProgress} />
        <SummaryCard title="Delivered" value={totals.delivered} />
        <SummaryCard title="Documents Available" value={totals.documents} />
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Recent Orders</h2>
          <p className="text-sm text-slate-400">
            Prices are locked when a snapshot is present. Status is read-only from enforcement.
          </p>
        </div>
        <div className="overflow-auto rounded border border-slate-800">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900 text-slate-200">
              <tr>
                <th className="px-4 py-2 text-left">Order ID</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Pricing Snapshot</th>
                <th className="px-4 py-2 text-left">Last Update</th>
              </tr>
            </thead>
            <tbody>
              {sampleOrders.map((order) => (
                <tr key={order.id} className="border-t border-slate-800">
                  <td className="px-4 py-2">{order.id}</td>
                  <td className="px-4 py-2">{order.status}</td>
                  <td className="px-4 py-2">
                    {order.locked ? (
                      <span className="text-emerald-300">Locked Price</span>
                    ) : (
                      <span className="text-amber-300">Snapshot Pending</span>
                    )}
                  </td>
                  <td className="px-4 py-2">{order.updated}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-lg border border-emerald-400/40 bg-emerald-400/5 p-4">
      <p className="text-sm text-slate-300">{title}</p>
      <p className="text-2xl font-semibold text-emerald-200">{value}</p>
    </div>
  );
}
