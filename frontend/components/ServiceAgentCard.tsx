import Link from "next/link";
import Image from "next/image";
import { ServiceAgent } from "../data/serviceAgents";

interface ServiceAgentCardProps {
  agent: ServiceAgent;
  href: string;
}

export default function ServiceAgentCard({ agent, href }: ServiceAgentCardProps) {
  return (
    <div className="bg-surface rounded-2xl shadow-card p-4 space-y-3 hover:shadow-card transition">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center overflow-hidden">
          <Image src={agent.logo} alt={agent.name} width={48} height={48} sizes="48px" />
        </div>
        <div className="flex-1">
          <p className="text-xs uppercase tracking-wide text-muted">{agent.agentType}</p>
          <h3 className="text-base font-semibold text-strong leading-tight">{agent.name}</h3>
        </div>
      </div>
      <p className="text-sm text-muted">{agent.description}</p>
      <p className="text-sm text-muted">Regions: {agent.regionsServed.join(", ")}</p>
      <Link href={href} className="text-brand-700 font-semibold text-sm">
        View details
      </Link>
    </div>
  );
}
