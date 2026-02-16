import type { Metadata } from "next";
import DocumentPageLayout from "../../../../components/DocumentPageLayout";

const titleText = "Product Approval & Rejection";
const description = "How products are reviewed before listing on RedRooEnergy.";

export const metadata: Metadata = {
  title: `${titleText} | RedRooEnergy`,
  description,
  alternates: {
    canonical: "/compliance-certification-standards/product-approval-rejection",
  },
};

const meta = { lastUpdated: "2026-02-04", version: "v1.0" };

export default function Page() {
  const sections = [
    {
      heading: "Overview",
      paragraphs: [
        "RedRooEnergy reviews products before they are listed so buyers see items that are suitable for use in Australia. This process helps reduce uncertainty and avoids problems after purchase.",
      ],
    },
    {
      heading: "What you should know",
      paragraphs: [
        "Products are not listed automatically. Suppliers submit products for review, along with required information and documents. Each submission is checked against applicable requirements for its category before a decision is made.",
      ],
    },
    {
      heading: "Scope and intent",
      paragraphs: [
        "This page explains the approval and rejection process in plain language. It is not a technical checklist or legal assessment. Its purpose is to set clear expectations about how decisions are made.",
      ],
    },
    {
      heading: "How product approval works",
      paragraphs: [],
      bullets: [
        "Suppliers submit product details and supporting documents through the platform.",
        "The information is reviewed to confirm it meets the relevant requirements.",
        "If the product meets the criteria, it is approved and can be listed for buyers to see.",
      ],
    },
    {
      heading: "Why a product may be rejected",
      paragraphs: [],
      bullets: [
        "A product may be rejected if required information or documents are missing.",
        "A product may be rejected if it does not meet applicable Australian requirements.",
        "A product may be rejected if details are unclear, inconsistent, or cannot be verified.",
      ],
    },
    {
      heading: "What happens after rejection",
      paragraphs: [
        "When a product is rejected, the supplier is notified through the platform. In many cases, suppliers can update information or provide additional documents and resubmit the product for review.",
      ],
    },
    {
      heading: "Operational guardrails",
      paragraphs: [
        "Approval and rejection decisions are handled within the platform and recorded. Products that are not approved are not listed. Informal or off-platform approvals are not supported.",
      ],
    },
    {
      heading: "How this applies on RedRooEnergy",
      paragraphs: [
        "In practice, this process helps keep the marketplace reliable. Buyers can browse with confidence, and suppliers have a clear, structured path to getting products approved and listed correctly.",
      ],
    },
  ];

  return (
    <DocumentPageLayout
      title={titleText}
      subtitle="How products are reviewed before listing on RedRooEnergy."
      meta={meta}
      sections={sections}
    />
  );
}
