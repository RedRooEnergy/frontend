export default function HowItWorksPage() {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">How It Works</h2>
      <ol className="list-decimal list-inside text-slate-300 space-y-2">
        <li>Identity and roles are validated at entry; no UI bypass exists.</li>
        <li>Pricing snapshots are created and locked at checkout.</li>
        <li>Compliance gates are checked before shipment progression.</li>
        <li>Audit events are recorded append-only for every governed action.</li>
        <li>Extensions present capabilities within Core-enforced boundaries.</li>
      </ol>
      <p className="text-slate-300">
        Every step is enforced server-side; the UI surfaces status, denials, and confirmations exactly as they occur.
      </p>
    </section>
  );
}
