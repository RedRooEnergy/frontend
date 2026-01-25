const orders = [
  { id: "ORD-1021", status: "In Progress", locked: true },
  { id: "ORD-1010", status: "Delivered", locked: true },
  { id: "ORD-0998", status: "Awaiting Compliance", locked: false },
];

export default function BuyerOrdersPage() {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Your Orders</h2>
        <p className="text-slate-400 text-sm">
          Orders reflect enforced system state. Pricing snapshots are shown when locked; actions depend on backend permissions.
        </p>
      </div>
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
            {orders.map((order) => (
              <tr key={order.id} className="border-t border-slate-800">
                <td className="px-4 py-2">
                  <a className="text-emerald-300 underline" href={`/buyer/order/${order.id}`}>
                    {order.id}
                  </a>
                </td>
                <td className="px-4 py-2">{order.status}</td>
                <td className="px-4 py-2">
                  {order.locked ? (
                    <span className="text-emerald-300">Locked Price</span>
                  ) : (
                    <span className="text-amber-300">Snapshot Pending</span>
                  )}
                </td>
                <td className="px-4 py-2 text-slate-400 text-sm">
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
