type BeforeAfterDiffPanelProps = {
  before: unknown;
  after: unknown;
};

function stringify(input: unknown) {
  return JSON.stringify(input, null, 2);
}

export default function BeforeAfterDiffPanel({ before, after }: BeforeAfterDiffPanelProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Before / After</h3>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Before</p>
          <pre className="max-h-80 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
            {stringify(before)}
          </pre>
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">After</p>
          <pre className="max-h-80 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
            {stringify(after)}
          </pre>
        </div>
      </div>
    </section>
  );
}
