import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAgent, getAllAgentParams } from "../../../../data/serviceAgents";
import ServiceAgentProfileLayout from "../../../../components/ServiceAgentProfileLayout";

export async function generateStaticParams() {
  return getAllAgentParams("compliance");
}

export function generateMetadata({ params }: { params: { agentSlug: string } }): Metadata {
  const agent = getAgent("compliance", params.agentSlug);
  if (!agent) return {};
  return {
    title: `${agent.name} | RedRooEnergy`,
    description: `${agent.name} compliance profile for RedRooEnergy.`.slice(0, 160),
    alternates: { canonical: `/service-agents/compliance/${agent.slug}` },
  };
}

export default function Page({ params }: { params: { agentSlug: string } }) {
  const agent = getAgent("compliance", params.agentSlug);
  if (!agent) return notFound();

  return <ServiceAgentProfileLayout agent={agent} />;
}
