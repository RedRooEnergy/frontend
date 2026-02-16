import Link from "next/link";

const agentEntries = [
  {
    title: "Freight & Shipping Agents",
    description: "DDP-capable logistics partners for renewable energy shipments.",
    href: "/service-agents/freight-shipping",
  },
  {
    title: "Compliance Agents",
    description: "Standards and documentation specialists for governed deployments.",
    href: "/service-agents/compliance",
  },
  {
    title: "Licensed Installers / Electricians",
    description: "CEC-accredited and licensed professionals for PV, storage, and EV.",
    href: "/service-agents/installers",
  },
  {
    title: "Approved Suppliers",
    description: "Pre-vetted suppliers with compliant product lines.",
    href: "/service-agents/suppliers",
  },
];

export default function ServiceAgentsSection() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-6 space-y-4" aria-labelledby="agents-heading">
      <div className="flex items-center justify-between">
        <h2 id="agents-heading" className="text-xl font-semibold">Approved Service Agents</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {agentEntries.map((entry) => (
          <div key={entry.title} className="bg-surface rounded-2xl shadow-card p-4 space-y-3 hover:shadow-card transition">
            <div>
              <h3 className="text-base font-semibold leading-tight">{entry.title}</h3>
              <p className="text-sm text-muted">{entry.description}</p>
            </div>
            <Link href={entry.href} className="inline-block px-3 py-2 bg-brand-700 text-brand-100 rounded-md font-semibold">
              Find Approved Agents
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
