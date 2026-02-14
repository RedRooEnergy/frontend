type SupplierProfilePanelProps = {
  supplierId: string;
};

export default function SupplierProfilePanel({ supplierId }: SupplierProfilePanelProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">Supplier profile</h3>
      <p className="mt-1 text-sm text-slate-600">Supplier ID: {supplierId}</p>
      <p className="mt-2 text-xs text-slate-500">Read-only in Phase B3. Mutation controls remain hidden until backend moderation endpoints are authorized.</p>
    </section>
  );
}
