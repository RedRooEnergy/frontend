import type { Metadata } from "next";
import DocumentPageLayout from "../../../../components/DocumentPageLayout";

const titleText = "RCM & EESS Compliance";
const description = "Public summary for RedRooEnergy marketplace participants covering purpose, scope, responsibilities, and how it applies within the governed platform.";

export const metadata: Metadata = {
  title: `${titleText} | RedRooEnergy`,
  description,
  alternates: {
    canonical: "/compliance-certification-standards/rcm-eess-compliance",
  },
};

const meta = { lastUpdated: "2026-01-29", version: "v1.0" };

export default function Page() {
  const sections = [
    {
      heading: "Overview",
      paragraphs: [
        "RedRooEnergy is designed to support products that meet Australian electrical safety and equipment standards. This includes requirements under the Regulatory Compliance Mark (RCM) and the Electrical Equipment Safety System (EESS).",
      ],
    },
    {
      heading: "What you should know",
      paragraphs: [
        "RCM and EESS requirements exist to ensure electrical products are safe and suitable for use in Australia. Products listed on RedRooEnergy are reviewed against these requirements before being made available, helping reduce the risk of unsafe or non-approved equipment entering the market.",
      ],
    },
    {
      heading: "Scope and intent",
      paragraphs: [
        "This page explains, in plain language, how RCM and EESS compliance is handled on the marketplace. It is not technical or legal advice. Its purpose is to give users confidence that safety and electrical standards are considered upfront.",
      ],
    },
    {
      heading: "Stakeholder roles",
      paragraphs: [
        "Buyers benefit from knowing listed products have already been checked for Australian electrical requirements.",
        "Suppliers are responsible for providing compliant products and supporting documentation.",
        "Installers and service partners rely on compliant equipment to complete work without regulatory issues.",
        "Administrators ensure compliance checks are applied consistently.",
      ],
    },
    {
      heading: "Operational guardrails",
      paragraphs: [
        "RedRooEnergy applies structured checks before products are listed. Items that do not meet required RCM or EESS standards are not approved for sale on the platform.",
      ],
    },
    {
      heading: "How this applies on RedRooEnergy",
      paragraphs: [
        "In practice, this means buyers do not need to navigate complex electrical rules themselves. The marketplace handles compliance verification so approved products can be selected with confidence for Australian use.",
      ],
    },
  ];

  return (
    <DocumentPageLayout
      title={titleText}
      subtitle="How RedRooEnergy supports Australian electrical safety requirements."
      meta={meta}
      sections={sections}
    />
  );
}
