const supplierOrders = [
  { id: "ORD-2001", status: "In Progress", pricingLocked: true },
  { id: "ORD-1998", status: "Awaiting Compliance", pricingLocked: false },
  { id: "ORD-1988", status: "Delivered", pricingLocked: true },
];

export default function SupplierOrdersPage() {
  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold">Supplier Orders</h2>
        <p className="text-slate-400 text-sm">
          Order states and pricing locks are determined by backend enforcement. No manual state changes are available here.
        </p>
      </header>
      <div className="overflow-auto rounded border border-slate-800">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900 text-slate-200">
            <tr>
              <th className="px-4 py-2 text-left">Order ID</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Pricing Snapshot</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {supplierOrders.map((order) => (
              <tr key={order.id} className="border-t border-slate-800">
                <td className="px-4 py-2">{order.id}</td>
                <td className="px-4 py-2">{order.status}</td>
                <td className="px-4 py-2">
                  {order.pricingLocked ? (
                    <span className="text-emerald-300">Locked Price</span>
                  ) : (
                    <span className="text-amber-300">Snapshot Pending</span>
                  )}
                </td>
                <td className="px-4 py-2 text-slate-400 text-xs">
                  <span className="inline-block rounded border border-slate-700 px-2 py-1 opacity-70">
                    Actions controlled by backend
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
