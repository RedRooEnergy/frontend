import type { Metadata } from "next";
import { getAgentsByType } from "../../../data/serviceAgents";
import ServiceAgentDirectoryLayout from "../../../components/ServiceAgentDirectoryLayout";

const titleText = "Approved Compliance Agents";
const description = "Directory of approved compliance agents providing standards alignment and documentation support for RedRooEnergy participants.";

export const metadata: Metadata = {
  title: `${titleText} | RedRooEnergy`,
  description,
  alternates: { canonical: "/service-agents/compliance" },
};

export default function Page() {
  const agents = getAgentsByType("compliance");
  return (
    <ServiceAgentDirectoryLayout
      title={titleText}
      subtitle="Specialists in compliance evidence review, standards mapping, and documentation alignment."
      agents={agents}
      basePath="/service-agents/compliance"
    />
  );
}
