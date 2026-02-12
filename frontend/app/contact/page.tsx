export default function ContactPage() {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">Contact & Support</h2>
      <p className="text-slate-300">
        Reach the governance and support teams for questions about enforced workflows, compliance evidence, or onboarding.
      </p>
      <div className="space-y-2 text-slate-300">
        <p>
          Email:{" "}
          <a className="underline hover:no-underline" href="mailto:support@redroo.energy">
            support@redroo.energy
          </a>
        </p>
        <p>
          Governance Desk:{" "}
          <a className="underline hover:no-underline" href="mailto:governance@redroo.energy">
            governance@redroo.energy
          </a>
        </p>
      </div>
      <p className="text-slate-400 text-sm">Support cannot override governance or enforcement decisions.</p>
    </section>
  );
}
