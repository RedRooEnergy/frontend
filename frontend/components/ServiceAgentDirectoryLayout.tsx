import ServiceAgentCard from "./ServiceAgentCard";
import { ServiceAgent } from "../data/serviceAgents";

interface ServiceAgentDirectoryLayoutProps {
  title: string;
  subtitle: string;
  agents: ServiceAgent[];
  basePath: string;
  trustNote?: string;
  onboardingCta?: {
    href: string;
    label: string;
    hint?: string;
  };
}

export default function ServiceAgentDirectoryLayout({
  title,
  subtitle,
  agents,
  basePath,
  trustNote = "Agents listed here are approved for the RedRooEnergy marketplace. Suitability depends on project scope, region, and compliance requirements.",
  onboardingCta,
}: ServiceAgentDirectoryLayoutProps) {
  return (
    <div className="min-h-screen bg-surface-muted text-strong">
      <section className="bg-brand-100">
        <div className="max-w-6xl mx-auto px-6 py-10 space-y-3">
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-base text-muted">{subtitle}</p>
          {onboardingCta ? (
            <div className="pt-2">
              <a
                href={onboardingCta.href}
                className="inline-flex items-center rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
              >
                {onboardingCta.label}
              </a>
              {onboardingCta.hint ? <p className="mt-2 text-sm text-muted">{onboardingCta.hint}</p> : null}
            </div>
          ) : null}
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <ServiceAgentCard key={agent.slug} agent={agent} href={`${basePath}/${agent.slug}`} />
          ))}
        </section>

        <section className="bg-surface rounded-2xl shadow-card p-5">
          <h2 className="text-lg font-semibold">Trust & suitability note</h2>
          <p className="text-sm text-muted">{trustNote}</p>
        </section>
      </main>
      <div className="h-8" aria-hidden />
    </div>
  );
}
