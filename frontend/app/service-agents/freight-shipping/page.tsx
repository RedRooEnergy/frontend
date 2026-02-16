import type { Metadata } from "next";
import { getAgentsByType } from "../../../data/serviceAgents";
import ServiceAgentDirectoryLayout from "../../../components/ServiceAgentDirectoryLayout";

const titleText = "Approved Freight & Shipping Agents";
const description = "Directory of approved freight and shipping agents supporting Delivered Duty Paid and project logistics for RedRooEnergy.";

export const metadata: Metadata = {
  title: `${titleText} | RedRooEnergy`,
  description,
  alternates: { canonical: "/service-agents/freight-shipping" },
};

export default function Page() {
  const agents = getAgentsByType("freight");
  return (
    <ServiceAgentDirectoryLayout
      title={titleText}
      subtitle="Logistics partners experienced with DDP, customs, and last-mile delivery for renewable energy shipments."
      agents={agents}
      basePath="/service-agents/freight-shipping"
    />
  );
}
