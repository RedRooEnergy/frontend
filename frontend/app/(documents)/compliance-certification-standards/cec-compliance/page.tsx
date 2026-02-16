import type { Metadata } from "next";
import DocumentPageLayout from "../../../../components/DocumentPageLayout";

const titleText = "CEC Compliance";
const description = "Public summary for RedRooEnergy marketplace participants covering purpose, scope, responsibilities, and how it applies within the governed platform.";

export const metadata: Metadata = {
  title: `${titleText} | RedRooEnergy`,
  description,
  alternates: {
    canonical: "/compliance-certification-standards/cec-compliance",
  },
};

const meta = { lastUpdated: "2026-01-29", version: "v1.0" };

export default function Page() {
  const sections = [
    {
      heading: "Overview",
      paragraphs: [
        "RedRooEnergy is built to support products that meet Australian clean energy expectations, including those set by the Clean Energy Council (CEC). The marketplace applies checks so buyers are not left guessing whether products are suitable for use in Australia.",
      ],
    },
    {
      heading: "What you should know",
      paragraphs: [
        "CEC compliance matters because many renewable energy systems in Australia must meet Clean Energy Council requirements to be installed, approved, or eligible for rebates. Products shown on RedRooEnergy are reviewed against these expectations before they are listed, where applicable.",
      ],
    },
    {
      heading: "Scope and intent",
      paragraphs: [
        "This page explains, in simple terms, how CEC compliance fits into the marketplace. It is not technical guidance or certification advice. Its purpose is to give everyday users confidence that CEC requirements are taken into account.",
      ],
    },
    {
      heading: "Stakeholder roles",
      paragraphs: [
        "Buyers can choose products knowing CEC considerations have already been checked.",
        "Suppliers are responsible for providing products and documentation that meet CEC-related requirements.",
        "Installers and service partners rely on this alignment to complete work without avoidable compliance issues.",
        "Administrators ensure checks are applied consistently across the platform.",
      ],
    },
    {
      heading: "Operational guardrails",
      paragraphs: [
        "RedRooEnergy does not list products that fail required compliance checks. Supporting documents are reviewed before approval, helping prevent unsuitable equipment from entering the marketplace.",
      ],
    },
    {
      heading: "How this applies on RedRooEnergy",
      paragraphs: [
        "In practice, this means buyers can focus on selecting the right system, not researching CEC rules. The marketplace handles the upfront checks so products listed are ready for use within Australian clean energy programs.",
      ],
    },
  ];

  return (
    <DocumentPageLayout
      title={titleText}
      subtitle="How RedRooEnergy supports Clean Energy Council requirements."
      meta={meta}
      sections={sections}
    />
  );
}
