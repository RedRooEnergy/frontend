import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAgent, getAllAgentParams } from "../../../../data/serviceAgents";
import { getProduct } from "../../../../data/categories";
import ServiceAgentProfileLayout from "../../../../components/ServiceAgentProfileLayout";

export async function generateStaticParams() {
  return getAllAgentParams("supplier");
}

export function generateMetadata({ params }: { params: { agentSlug: string } }): Metadata {
  const agent = getAgent("supplier", params.agentSlug);
  if (!agent) return {};
  return {
    title: `${agent.name} | RedRooEnergy`,
    description: `${agent.name} supplier profile for RedRooEnergy.`.slice(0, 160),
    alternates: { canonical: `/service-agents/suppliers/${agent.slug}` },
  };
}

export default function Page({ params }: { params: { agentSlug: string } }) {
  const agent = getAgent("supplier", params.agentSlug);
  if (!agent) return notFound();

  const approvedProducts =
    agent.approvedProducts
      ?.map((slug) => getProduct(slug))
      .filter((entry) => entry !== undefined)
      .map((entry) => entry!.product) || [];

  return <ServiceAgentProfileLayout agent={agent} approvedProducts={approvedProducts} />;
}
