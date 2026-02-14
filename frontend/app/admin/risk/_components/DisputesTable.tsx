type DisputesTableProps = {
  backendAvailable: boolean;
};

export default function DisputesTable({ backendAvailable }: DisputesTableProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">Disputes</h3>
      {backendAvailable ? (
        <p className="mt-2 text-sm text-slate-600">Dispute records will render once dispute endpoints are available.</p>
      ) : (
        <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-sm text-amber-800">
          Backend wiring required for disputes.
        </p>
      )}
    </section>
  );
}
