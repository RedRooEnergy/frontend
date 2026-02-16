import type { Metadata } from "next";
import { getAgentsByType } from "../../../data/serviceAgents";
import ServiceAgentDirectoryLayout from "../../../components/ServiceAgentDirectoryLayout";

const titleText = "Approved Licensed Installers & Electricians";
const description = "Directory of licensed installers and electricians approved for RedRooEnergy projects.";

export const metadata: Metadata = {
  title: `${titleText} | RedRooEnergy`,
  description,
  alternates: { canonical: "/service-agents/installers" },
};

export default function Page() {
  const agents = getAgentsByType("installer");
  return (
    <ServiceAgentDirectoryLayout
      title={titleText}
      subtitle="CEC-accredited and licensed installers for residential, C&I, and utility deployments."
      agents={agents}
      basePath="/service-agents/installers"
      onboardingCta={{
        href: "/signin?role=service-partner",
        label: "Start installer onboarding",
        hint: "Licensed installers can apply through the governed service-partner onboarding workflow.",
      }}
    />
  );
}
