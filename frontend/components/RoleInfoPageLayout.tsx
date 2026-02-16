import Link from "next/link";

interface RoleInfoPageLayoutProps {
  title: string;
  subtitle: string;
  audience: string[];
  steps: string[];
  benefits: string[];
  responsibilities: string[];
  complianceNote: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export default function RoleInfoPageLayout({
  title,
  subtitle,
  audience,
  steps,
  benefits,
  responsibilities,
  complianceNote,
  ctaLabel,
  ctaHref,
}: RoleInfoPageLayoutProps) {
  return (
    <div className="min-h-screen bg-surface-muted text-strong">
      <section className="bg-brand-100">
        <div className="max-w-6xl mx-auto px-6 py-10 space-y-3">
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-base text-muted">{subtitle}</p>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <section className="bg-surface rounded-2xl shadow-card p-6 space-y-3">
          <h2 className="text-xl font-semibold">Who this is for</h2>
          <ul className="list-disc pl-5 space-y-1 text-sm text-muted">
            {audience.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="bg-surface rounded-2xl shadow-card p-6 space-y-3">
          <h2 className="text-xl font-semibold">How it works on RedRooEnergy</h2>
          <ol className="list-decimal pl-5 space-y-1 text-sm text-muted">
            {steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-surface rounded-2xl shadow-card p-6 space-y-2">
            <h2 className="text-xl font-semibold">What you gain</h2>
            <ul className="list-disc pl-5 space-y-1 text-sm text-muted">
              {benefits.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="bg-surface rounded-2xl shadow-card p-6 space-y-2">
            <h2 className="text-xl font-semibold">Your responsibilities</h2>
            <ul className="list-disc pl-5 space-y-1 text-sm text-muted">
              {responsibilities.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="bg-surface rounded-2xl shadow-card p-6 space-y-2">
          <h2 className="text-xl font-semibold">Compliance & trust notes</h2>
          <p className="text-sm text-muted">{complianceNote}</p>
        </section>

        {ctaLabel && ctaHref && (
          <section className="bg-brand-800 text-brand-100 rounded-2xl shadow-card p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Ready to get started?</h2>
              <p className="text-sm text-brand-100/80">Follow the onboarding steps after signing in or registering.</p>
            </div>
            <Link
              href={ctaHref}
              className="px-4 py-2 bg-surface text-brand-800 rounded-md font-semibold shadow-card"
            >
              {ctaLabel}
            </Link>
          </section>
        )}
      </main>
      <div className="h-8" aria-hidden />
    </div>
  );
}
