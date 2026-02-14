type ComplianceSummaryProps = {
  backendAvailable: boolean;
};

export default function ComplianceSummary({ backendAvailable }: ComplianceSummaryProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">Compliance summary</h3>
      {!backendAvailable ? (
        <p className="mt-2 text-sm text-slate-600">Compliance feed unavailable until product moderation APIs are wired.</p>
      ) : (
        <p className="mt-2 text-sm text-slate-600">Compliance details returned by backend would render here.</p>
      )}
    </section>
  );
}
