import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAgent, getAllAgentParams } from "../../../../data/serviceAgents";
import ServiceAgentProfileLayout from "../../../../components/ServiceAgentProfileLayout";

export async function generateStaticParams() {
  return getAllAgentParams("installer");
}

export function generateMetadata({ params }: { params: { agentSlug: string } }): Metadata {
  const agent = getAgent("installer", params.agentSlug);
  if (!agent) return {};
  return {
    title: `${agent.name} | RedRooEnergy`,
    description: `${agent.name} installer profile for RedRooEnergy.`.slice(0, 160),
    alternates: { canonical: `/service-agents/installers/${agent.slug}` },
  };
}

export default function Page({ params }: { params: { agentSlug: string } }) {
  const agent = getAgent("installer", params.agentSlug);
  if (!agent) return notFound();

  return <ServiceAgentProfileLayout agent={agent} />;
}
