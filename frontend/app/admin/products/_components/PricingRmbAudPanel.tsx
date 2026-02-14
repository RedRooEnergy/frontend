type PricingRmbAudPanelProps = {
  backendAvailable: boolean;
};

export default function PricingRmbAudPanel({ backendAvailable }: PricingRmbAudPanelProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">RMB / AUD pricing reference</h3>
      {!backendAvailable ? (
        <p className="mt-2 text-sm text-slate-600">Display-only placeholder. Backend product pricing endpoint not wired.</p>
      ) : (
        <p className="mt-2 text-sm text-slate-600">Would show RMB source, AUD conversion, and linked FX policy reference.</p>
      )}
    </section>
  );
}
