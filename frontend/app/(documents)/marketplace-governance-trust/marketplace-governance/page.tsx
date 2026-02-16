import type { Metadata } from "next";
import DocumentPageLayout from "../../../../components/DocumentPageLayout";

const titleText = "Marketplace Governance";
const description = "Public summary for RedRooEnergy marketplace participants covering purpose, scope, responsibilities, and how it applies within the governed platform.";

export const metadata: Metadata = {
  title: `${titleText} | RedRooEnergy`,
  description,
  alternates: {
    canonical: "/marketplace-governance-trust/marketplace-governance",
  },
};

const meta = { lastUpdated: "2026-01-29", version: "v1.0" };

export default function Page() {
  const sections = [
    {
      heading: "Overview",
      paragraphs: [
        "RedRooEnergy uses clear, consistent rules to make sure the marketplace works the same way for everyone. Governance simply means the platform is organised and managed, not left to guesswork.",
      ],
    },
    {
      heading: "What you should know",
      paragraphs: [
        "RedRooEnergy is not run on personal judgement or informal deals. Products are reviewed, sellers follow the same requirements, and orders move through a defined process. This helps reduce problems and builds confidence for buyers and suppliers.",
      ],
    },
    {
      heading: "Scope and intent",
      paragraphs: [
        "This page explains marketplace governance in everyday language. It is not legal text. Its purpose is to help users understand that the platform follows set rules to keep things running smoothly.",
      ],
    },
    {
      heading: "Stakeholder roles",
      paragraphs: [
        "Buyers can trust that products follow the same approval process.",
        "Suppliers know what is expected when listing and fulfilling orders.",
        "Service partners work within clear boundaries for delivery, installation, or checks.",
        "Administrators ensure the rules are applied consistently across the platform.",
      ],
    },
    {
      heading: "Operational guardrails",
      paragraphs: [
        "RedRooEnergy uses built-in checks to manage listings, orders, payments, and records. These checks are there to prevent confusion and keep activity organised, without adding complexity for users.",
      ],
    },
    {
      heading: "How this applies on RedRooEnergy",
      paragraphs: [
        "In practice, governance means fewer surprises. Products are checked before listing, orders follow a clear path, and records are kept automatically. This allows everyone to use the marketplace with confidence, knowing it operates in a structured and reliable way.",
      ],
    },
  ];

  return (
    <DocumentPageLayout
      title={titleText}
      subtitle="How RedRooEnergy keeps the marketplace fair and dependable."
      meta={meta}
      sections={sections}
    />
  );
}
