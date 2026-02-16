import type { Metadata } from "next";
import { getAgentsByType } from "../../../data/serviceAgents";
import ServiceAgentDirectoryLayout from "../../../components/ServiceAgentDirectoryLayout";

const titleText = "Approved Suppliers";
const description = "Directory of approved suppliers with documented products and compliance evidence for RedRooEnergy.";

export const metadata: Metadata = {
  title: `${titleText} | RedRooEnergy`,
  description,
  alternates: { canonical: "/service-agents/suppliers" },
};

export default function Page() {
  const agents = getAgentsByType("supplier");
  return (
    <ServiceAgentDirectoryLayout
      title={titleText}
      subtitle="Suppliers approved to list products with the required compliance documentation."
      agents={agents}
      basePath="/service-agents/suppliers"
    />
  );
}
