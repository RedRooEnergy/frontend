import StatusPill from "../../_components/StatusPill";

type SupplierRow = {
  supplierId: string;
  name: string;
  status: string;
  tier: string;
  risk: string;
};

type SupplierTableProps = {
  rows: SupplierRow[];
};

export default function SupplierTable({ rows }: SupplierTableProps) {
  if (!rows.length) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
        Supplier endpoint available but no records returned.
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600">
          <tr>
            <th className="px-3 py-2">Supplier ID</th>
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Tier</th>
            <th className="px-3 py-2">Risk</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.supplierId} className="border-t border-slate-100">
              <td className="px-3 py-2 font-mono text-xs text-slate-700">{row.supplierId}</td>
              <td className="px-3 py-2 text-slate-700">{row.name}</td>
              <td className="px-3 py-2">
                <StatusPill label={row.status} tone={row.status === "APPROVED" ? "green" : "amber"} />
              </td>
              <td className="px-3 py-2 text-slate-700">{row.tier}</td>
              <td className="px-3 py-2 text-slate-700">{row.risk}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
