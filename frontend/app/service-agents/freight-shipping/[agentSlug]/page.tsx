import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAgent, getAllAgentParams } from "../../../../data/serviceAgents";
import ServiceAgentProfileLayout from "../../../../components/ServiceAgentProfileLayout";

export async function generateStaticParams() {
  return getAllAgentParams("freight");
}

export function generateMetadata({ params }: { params: { agentSlug: string } }): Metadata {
  const agent = getAgent("freight", params.agentSlug);
  if (!agent) return {};
  return {
    title: `${agent.name} | RedRooEnergy`,
    description: `${agent.name} freight and shipping profile for RedRooEnergy.`.slice(0, 160),
    alternates: { canonical: `/service-agents/freight-shipping/${agent.slug}` },
  };
}

export default function Page({ params }: { params: { agentSlug: string } }) {
  const agent = getAgent("freight", params.agentSlug);
  if (!agent) return notFound();

  return <ServiceAgentProfileLayout agent={agent} />;
}
