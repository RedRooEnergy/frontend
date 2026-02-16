import type { Metadata } from "next";
import DocumentPageLayout from "../../../../components/DocumentPageLayout";

const titleText = "Modern Slavery Statement";
const description = "Public summary for RedRooEnergy marketplace participants covering purpose, scope, responsibilities, and how it applies within the governed platform.";

export const metadata: Metadata = {
  title: `${titleText} | RedRooEnergy`,
  description,
  alternates: {
    canonical: "/core-legal-consumer/modern-slavery-statement",
  },
};

const meta = { lastUpdated: "2026-01-29", version: "v1.0" };

export default function Page() {
  const sections = [
    {
      heading: "Overview",
      paragraphs: [
        "RedRooEnergy is committed to operating responsibly and expects ethical practices across the supply chains that support the marketplace. This includes taking steps to reduce the risk of modern slavery and unfair labour practices.",
      ],
    },
    {
      heading: "What you should know",
      paragraphs: [
        "Modern slavery can include forced labour, unsafe working conditions, or unfair treatment of workers. While RedRooEnergy does not manufacture products itself, it recognises the importance of encouraging responsible behaviour from suppliers and partners who participate on the platform.",
      ],
    },
    {
      heading: "Scope and intent",
      paragraphs: [
        "This page explains RedRooEnergy’s approach in plain language. It is not a legal assessment of individual suppliers. Its purpose is to show that ethical sourcing and fair treatment are taken seriously as part of how the marketplace operates.",
      ],
    },
    {
      heading: "Stakeholder roles",
      paragraphs: [
        "Suppliers are expected to operate their businesses lawfully and responsibly, including how workers are treated.",
        "Buyers benefit from participating in a marketplace that values ethical standards.",
        "Service partners are expected to follow lawful employment and operating practices.",
        "RedRooEnergy sets expectations and monitors participation at a marketplace level.",
      ],
    },
    {
      heading: "Operational guardrails",
      paragraphs: [
        "RedRooEnergy applies onboarding checks and requires suppliers to confirm compliance with applicable laws. Where concerns are identified, the platform may request further information or take action to protect marketplace integrity.",
      ],
    },
    {
      heading: "How this applies on RedRooEnergy",
      paragraphs: [
        "In practice, this means RedRooEnergy promotes transparency and responsible participation. The marketplace is structured to support ethical standards and to reduce the risk of unacceptable practices within its operating environment.",
      ],
    },
  ];

  return (
    <DocumentPageLayout
      title={titleText}
      subtitle="How RedRooEnergy approaches responsible sourcing."
      meta={meta}
      sections={sections}
    />
  );
}
