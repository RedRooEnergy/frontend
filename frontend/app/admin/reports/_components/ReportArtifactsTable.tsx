type ReportArtifactsTableProps = {
  backendAvailable: boolean;
};

export default function ReportArtifactsTable({ backendAvailable }: ReportArtifactsTableProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">Generated artifacts</h3>
      {backendAvailable ? (
        <p className="mt-2 text-sm text-slate-600">Artifact list will populate from backend once report APIs are wired.</p>
      ) : (
        <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-sm text-amber-800">
          NOT AVAILABLE (backend not wired)
        </p>
      )}
    </section>
  );
}
