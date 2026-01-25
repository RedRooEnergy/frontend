const documents = [
  { id: "DOC-2201", name: "Invoice - ORD-1021.pdf", status: "Available", orderId: "ORD-1021" },
  { id: "DOC-2199", name: "Compliance - ORD-0998.pdf", status: "Available", orderId: "ORD-0998" },
];

export default function BuyerDocumentsPage() {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Documents</h2>
      <p className="text-slate-400 text-sm">Documents are read-only; availability is governed by backend enforcement.</p>
      <ul className="space-y-2">
        {documents.map((doc) => (
          <li key={doc.id} className="flex items-center justify-between rounded border border-slate-800 p-3">
            <div>
              <p className="text-slate-200">{doc.name}</p>
              <p className="text-slate-400 text-sm">Order {doc.orderId}</p>
            </div>
            <button className="text-emerald-300 underline">Download</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
