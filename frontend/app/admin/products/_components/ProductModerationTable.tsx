import StatusPill from "../../_components/StatusPill";

type ProductRow = {
  productId: string;
  name: string;
  category: string;
  approvalStatus: string;
};

type ProductModerationTableProps = {
  rows: ProductRow[];
};

export default function ProductModerationTable({ rows }: ProductModerationTableProps) {
  if (!rows.length) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
        Product endpoint available but no records returned.
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600">
          <tr>
            <th className="px-3 py-2">Product ID</th>
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">Category</th>
            <th className="px-3 py-2">Approval status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.productId} className="border-t border-slate-100">
              <td className="px-3 py-2 font-mono text-xs text-slate-700">{row.productId}</td>
              <td className="px-3 py-2 text-slate-700">{row.name}</td>
              <td className="px-3 py-2 text-slate-700">{row.category}</td>
              <td className="px-3 py-2">
                <StatusPill label={row.approvalStatus} tone={row.approvalStatus === "APPROVED" ? "green" : "amber"} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
