import Link from "next/link";
import Image from "next/image";
import { Product } from "../data/categories";
import { ServiceAgent } from "../data/serviceAgents";

interface ServiceAgentProfileLayoutProps {
  agent: ServiceAgent;
  approvedProducts?: Product[];
}

export default function ServiceAgentProfileLayout({ agent, approvedProducts = [] }: ServiceAgentProfileLayoutProps) {
  const isSupplier = agent.agentType === "supplier";

  return (
    <div className="min-h-screen bg-surface-muted text-strong">
      <section className="bg-brand-100">
        <div className="max-w-6xl mx-auto px-6 py-10 space-y-3 flex items-center gap-4">
          <div className="w-14 h-14 bg-surface rounded-lg flex items-center justify-center overflow-hidden">
            <Image src={agent.logo} alt={agent.name} width={56} height={56} sizes="56px" />
          </div>
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted">{agent.agentType}</p>
            <h1 className="text-2xl font-bold leading-tight">{agent.name}</h1>
          </div>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <section className="bg-surface rounded-2xl shadow-card p-6 space-y-3">
          <h2 className="text-xl font-semibold">About</h2>
          <p className="text-base text-muted">{agent.description}</p>
          <p className="text-sm text-muted">Regions served: {agent.regionsServed.join(", ")}</p>
        </section>

        <section className="bg-surface rounded-2xl shadow-card p-6 space-y-3">
          <h2 className="text-xl font-semibold">Capabilities & certifications</h2>
          <ul className="list-disc pl-5 space-y-1 text-sm text-muted">
            {agent.certifications.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </section>

        <section className="bg-surface rounded-2xl shadow-card p-6 space-y-3">
          <h2 className="text-xl font-semibold">Contact</h2>
          <div className="space-y-1 text-sm text-muted">
            <div>Email: <Link href={`mailto:${agent.contact.email}`} className="text-brand-700">{agent.contact.email}</Link></div>
            <div>Phone: <Link href={`tel:${agent.contact.phone}`} className="text-brand-700">{agent.contact.phone}</Link></div>
            <div>Website: <Link href={agent.contact.website} className="text-brand-700">{agent.contact.website}</Link></div>
          </div>
        </section>

        {isSupplier && approvedProducts.length > 0 && (
          <section className="bg-surface rounded-2xl shadow-card p-6 space-y-3">
            <h2 className="text-xl font-semibold">Approved products</h2>
            <ul className="list-disc pl-5 space-y-1 text-sm text-muted">
              {approvedProducts.map((p) => (
                <li key={p.slug}>
                  <Link href={`/products/${p.slug}`} className="text-brand-700 font-semibold">
                    {p.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <div className="h-8" aria-hidden />
    </div>
  );
}
