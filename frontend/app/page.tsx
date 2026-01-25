export default function HomePage() {
  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <p className="text-sm uppercase tracking-widest text-emerald-300">Trust First</p>
        <h2 className="text-3xl font-semibold">A governed marketplace with enforced rules.</h2>
        <p className="text-slate-300 max-w-3xl">
          RedRoo ensures every transaction is bound by Core enforcement: locked pricing at checkout, verified compliance before
          shipment, and immutable audit trails. Extensions operate strictly within these rules.
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-emerald-400/40 bg-emerald-400/5 p-4">
            <h3 className="text-lg font-semibold">Locked Prices</h3>
            <p className="text-slate-300">Pricing snapshots are immutable once orders are placed—no post-commit edits.</p>
          </div>
          <div className="rounded-lg border border-emerald-400/40 bg-emerald-400/5 p-4">
            <h3 className="text-lg font-semibold">Compliance Verified</h3>
            <p className="text-slate-300">Shipments only progress after required compliance checks are confirmed.</p>
          </div>
          <div className="rounded-lg border border-emerald-400/40 bg-emerald-400/5 p-4">
            <h3 className="text-lg font-semibold">Immutable Audit</h3>
            <p className="text-slate-300">All actions are logged append-only with full traceability.</p>
          </div>
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-8">
        <div className="space-y-3">
          <h3 className="text-xl font-semibold">For Buyers</h3>
          <ul className="text-slate-300 list-disc list-inside space-y-1">
            <li>See locked pricing and snapshot IDs on every order.</li>
            <li>Track order status with enforced audit visibility.</li>
            <li>No hidden flows—denials are surfaced honestly.</li>
          </ul>
          <a className="inline-block mt-3 text-emerald-300 underline" href="/buyer/dashboard">
            Buyer Dashboard
          </a>
        </div>
        <div className="space-y-3">
          <h3 className="text-xl font-semibold">For Suppliers</h3>
          <ul className="text-slate-300 list-disc list-inside space-y-1">
            <li>Onboarding with enforced compliance checks.</li>
            <li>Products and shipments align with Core permissions.</li>
            <li>Uploads never equal approval—status is explicit.</li>
          </ul>
          <a className="inline-block mt-3 text-emerald-300 underline" href="/supplier/dashboard">
            Supplier Dashboard
          </a>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold">How Enforcement Protects You</h3>
        <ul className="text-slate-300 list-disc list-inside space-y-1">
          <li>Identity & Roles enforced at the API; UI reflects backend decisions.</li>
          <li>Pricing snapshots prevent after-the-fact edits.</li>
          <li>Audit immutability ensures evidence survives scrutiny.</li>
          <li>Extensions cannot bypass Core boundaries.</li>
        </ul>
      </section>
    </div>
  );
}
