type ImmutableTimelineProps = {
  title?: string;
};

export default function ImmutableTimeline({ title = "Immutable admin timeline" }: ImmutableTimelineProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">
        Timeline feed is endpoint-driven. No mutation actions are surfaced in this stage.
      </p>
      <ul className="mt-3 list-disc pl-5 text-xs text-slate-500">
        <li>Append-only audit doctrine remains enforced.</li>
        <li>Supplier status transitions require backend moderation endpoints.</li>
      </ul>
    </section>
  );
}
