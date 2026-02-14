type ReportGeneratorProps = {
  backendAvailable: boolean;
};

export default function ReportGenerator({ backendAvailable }: ReportGeneratorProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">Report generator</h3>
      <p className="mt-2 text-sm text-slate-600">Generation actions are disabled until backend report endpoints are authorized.</p>
      <button
        type="button"
        disabled
        className="mt-3 rounded-md bg-slate-300 px-3 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed"
      >
        Generate report (disabled)
      </button>
      {!backendAvailable ? (
        <p className="mt-2 text-xs text-amber-700">NOT AVAILABLE (backend not wired)</p>
      ) : null}
    </section>
  );
}
