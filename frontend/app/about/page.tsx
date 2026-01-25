export default function AboutPage() {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">About & Governance</h2>
      <p className="text-slate-300 max-w-3xl">
        RedRoo is built on a locked governance foundation: Core enforcement, immutable audit trails, and extension boundaries that
        prevent bypass. Every capability is explicitly governed and verified.
      </p>
      <ul className="list-disc list-inside text-slate-300 space-y-1">
        <li>Core rules are enforced server-side; UI is a truthful reflection.</li>
        <li>Extensions operate within Core constraints—never the other way around.</li>
        <li>Audit and compliance evidence remain immutable.</li>
      </ul>
    </section>
  );
}
