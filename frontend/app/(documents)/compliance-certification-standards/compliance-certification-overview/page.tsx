import type { Metadata } from "next";
import DocumentPageLayout from "../../../../components/DocumentPageLayout";

const titleText = "Compliance & Certification Overview";
const description = "Public summary for RedRooEnergy marketplace participants covering purpose, scope, responsibilities, and how it applies within the governed platform.";

export const metadata: Metadata = {
  title: `${titleText} | RedRooEnergy`,
  description,
  alternates: {
    canonical: "/compliance-certification-standards/compliance-certification-overview",
  },
};

const meta = { lastUpdated: "2026-01-29", version: "v1.0" };

export default function Page() {
  const sections = [
    {
      heading: "Overview",
      paragraphs: [
        "RedRooEnergy is built around one simple idea: products should meet Australian requirements before buyers see them. The marketplace applies compliance and certification checks so customers are not left to work this out on their own.",
      ],
    },
    {
      heading: "What you should know",
      paragraphs: [
        "Renewable energy products in Australia often need specific approvals and certifications. RedRooEnergy does not treat these as optional. Products are reviewed against the relevant Australian standards before they are listed, helping reduce the risk of unsuitable or non-approved equipment being sold.",
      ],
    },
    {
      heading: "Scope and intent",
      paragraphs: [
        "This page provides a plain-language overview of how compliance and certification fit into the marketplace. It is not technical guidance or legal advice. Its purpose is to explain the approach, not the fine detail of each standard.",
      ],
    },
    {
      heading: "Stakeholder roles",
      paragraphs: [
        "Buyers can browse products knowing checks have already been applied.",
        "Suppliers are responsible for providing compliant products and the required supporting documents.",
        "Installers and service partners rely on approved equipment to complete work without avoidable issues.",
        "Administrators oversee the process to ensure standards are applied consistently.",
      ],
    },
    {
      heading: "Operational guardrails",
      paragraphs: [
        "RedRooEnergy uses defined approval steps and documentation checks before products are made visible. Products that do not meet required standards are not listed. This keeps the marketplace consistent and dependable.",
      ],
    },
    {
      heading: "How this applies on RedRooEnergy",
      paragraphs: [
        "In practice, this means buyers can focus on choosing the right product, not researching regulations. Compliance and certification are handled upfront so products on the marketplace are ready for use in Australia.",
      ],
    },
  ];

  return (
    <DocumentPageLayout
      title={titleText}
      subtitle="How RedRooEnergy checks products before they are sold."
      meta={meta}
      sections={sections}
    />
  );
}
