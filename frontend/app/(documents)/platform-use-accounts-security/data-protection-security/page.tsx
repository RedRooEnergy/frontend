import type { Metadata } from "next";
import DocumentPageLayout from "../../../../components/DocumentPageLayout";

const titleText = "Data Protection & Security";
const description = "Public summary for RedRooEnergy marketplace participants covering purpose, scope, responsibilities, and how it applies within the governed platform.";

export const metadata: Metadata = {
  title: `${titleText} | RedRooEnergy`,
  description,
  alternates: {
    canonical: "/platform-use-accounts-security/data-protection-security",
  },
};

const meta = { lastUpdated: "2026-01-29", version: "v1.0" };

export default function Page() {
  const sections = [
    {
      heading: "Overview",
      paragraphs: [
        "RedRooEnergy is built to handle information responsibly. The platform is designed so personal, business, and order data is handled carefully and only used for running the marketplace.",
      ],
    },
    {
      heading: "What you should know",
      paragraphs: [
        "Using RedRooEnergy means sharing some information so orders, payments, and deliveries can happen properly. That information is not treated casually. Access is limited to what is needed, and data is not exposed to unrelated parties.",
      ],
    },
    {
      heading: "Scope and intent",
      paragraphs: [
        "This page explains, in simple terms, how RedRooEnergy approaches data protection and platform security. It is meant to give everyday users confidence, not to overwhelm them with technical detail.",
      ],
    },
    {
      heading: "Stakeholder roles",
      paragraphs: [
        "Buyers provide basic details to place and track orders.",
        "Suppliers access only the information needed to fulfil those orders.",
        "Service partners see limited information relevant to their role, such as delivery or installation tasks.",
        "Administrators maintain the system and monitor activity to keep everything running properly.",
      ],
    },
    {
      heading: "Operational guardrails",
      paragraphs: [
        "RedRooEnergy uses system controls to manage logins, permissions, and data access. Information is stored and handled in a structured way so it is not freely shared or misused. These controls exist to protect users without adding extra effort on their part.",
      ],
    },
    {
      heading: "How this applies on RedRooEnergy",
      paragraphs: [
        "In practice, this means users sign in securely, see only what they need to see, and can trust that their information is being handled as part of a controlled marketplace. Data is used to support transactions and records, not for unrelated purposes.",
      ],
    },
  ];

  return (
    <DocumentPageLayout
      title={titleText}
      subtitle="How RedRooEnergy looks after information on the platform."
      meta={meta}
      sections={sections}
    />
  );
}
