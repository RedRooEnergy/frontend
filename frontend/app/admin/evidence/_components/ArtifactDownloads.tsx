type ArtifactDownloadsProps = {
  backendAvailable: boolean;
};

export default function ArtifactDownloads({ backendAvailable }: ArtifactDownloadsProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">Artifact downloads</h3>
      {backendAvailable ? (
        <p className="mt-2 text-sm text-slate-600">Download links will render when evidence listing endpoint is available.</p>
      ) : (
        <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-sm text-amber-800">
          NOT AVAILABLE (backend not wired)
        </p>
      )}
    </section>
  );
}
