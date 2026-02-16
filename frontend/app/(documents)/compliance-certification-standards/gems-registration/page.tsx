import type { Metadata } from "next";
import DocumentPageLayout from "../../../../components/DocumentPageLayout";

const titleText = "GEMS Registration";
const description =
  "Public summary for RedRooEnergy marketplace participants covering purpose, scope, responsibilities, and how it applies within the governed platform.";

export const metadata: Metadata = {
  title: `${titleText} | RedRooEnergy`,
  description,
  alternates: {
    canonical: "/compliance-certification-standards/gems-registration",
  },
};

const meta = { lastUpdated: "2026-02-04", version: "v1.0" };

export default function Page() {
  const sections = [
    {
      heading: "Overview",
      paragraphs: [
        "RedRooEnergy supports products that must meet Australia’s energy efficiency rules under the Greenhouse and Energy Minimum Standards (GEMS) scheme. These rules exist to ensure certain products meet minimum performance and efficiency expectations before they are sold.",
      ],
    },
    {
      heading: "What you should know",
      paragraphs: [
        "Some electrical and energy-related products must be registered under GEMS before they can be supplied in Australia. This is not optional. Products that require GEMS registration are checked before they are listed on RedRooEnergy, helping prevent non-approved products from reaching buyers.",
      ],
    },
    {
      heading: "Scope and intent",
      paragraphs: [
        "This page explains GEMS registration in plain language. It is not technical guidance or regulatory advice. Its purpose is to reassure everyday users that energy efficiency requirements are considered as part of the product approval process.",
      ],
    },
    {
      heading: "Stakeholder roles",
      paragraphs: [
        "Buyers benefit from knowing products meet required energy efficiency standards.",
        "Suppliers are responsible for ensuring products that fall under GEMS are properly registered and supported by evidence.",
        "Installers and service partners rely on compliant products to complete work without regulatory issues.",
        "Administrators ensure GEMS-related checks are applied consistently where required.",
      ],
    },
    {
      heading: "Operational guardrails",
      paragraphs: [
        "RedRooEnergy does not list products that require GEMS registration unless the appropriate registration has been confirmed. Supporting information is reviewed before approval to keep listings accurate and compliant.",
      ],
    },
    {
      heading: "How this applies on RedRooEnergy",
      paragraphs: [
        "In practice, this means buyers do not need to understand GEMS rules themselves. If a product is listed and requires GEMS registration, those checks have already been handled in the background, allowing buyers to choose products with confidence for use in Australia.",
      ],
    },
  ];

  return (
    <DocumentPageLayout
      title={titleText}
      subtitle="How RedRooEnergy supports Australian energy efficiency requirements."
      meta={meta}
      sections={sections}
    />
  );
}
