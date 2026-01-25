interface OrderDetailProps {
  params: { id: string };
}

const documents = [
  { id: "DOC-2201", name: "Invoice.pdf", status: "Available" },
  { id: "DOC-2199", name: "Compliance.pdf", status: "Available" },
];

export default function BuyerOrderDetailPage({ params }: OrderDetailProps) {
  const orderId = params.id;
  const order = {
    id: orderId,
    status: "In Progress",
    date: "2026-01-18",
    snapshotId: "SNAP-7788-XY",
    locked: true,
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-sm text-slate-400">Order Detail</p>
        <h2 className="text-2xl font-semibold">{order.id}</h2>
        <p className="text-slate-300 text-sm">
          Status is read-only from enforcement. Actions depend on backend permissions.
        </p>
      </header>

      <section className="grid md:grid-cols-3 gap-4">
        <InfoCard title="Status" value={order.status} />
        <InfoCard title="Order Date" value={order.date} />
        <InfoCard
          title="Pricing Snapshot"
          value={order.snapshotId}
          badge={order.locked ? "Locked Price" : "Snapshot Pending"}
        />
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Documents</h3>
        <p className="text-slate-400 text-sm">Downloads are read-only; uploads do not imply approval.</p>
        <ul className="space-y-2">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between rounded border border-slate-800 p-3">
              <div>
                <p className="text-slate-200">{doc.name}</p>
                <p className="text-slate-400 text-sm">{doc.status}</p>
              </div>
              <button className="text-emerald-300 underline">Download</button>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="text-lg font-semibold">Support</h3>
        <p className="text-slate-400 text-sm">
          If an action is denied by enforcement, the UI will surface the backend reason. No optimistic success is shown.
        </p>
        <div className="flex gap-2">
          <button className="rounded border border-slate-700 px-3 py-2 text-slate-300 opacity-70">
            Request Update (controlled)
          </button>
          <button className="rounded border border-slate-700 px-3 py-2 text-slate-300 opacity-70">
            Contact Support
          </button>
        </div>
      </section>
    </div>
  );
}

function InfoCard({ title, value, badge }: { title: string; value: string; badge?: string }) {
  return (
    <div className="rounded-lg border border-slate-800 p-4 space-y-2">
      <p className="text-slate-400 text-sm">{title}</p>
      <p className="text-slate-200 text-lg font-semibold">{value}</p>
      {badge && <span className="text-emerald-300 text-sm">{badge}</span>}
    </div>
  );
}
