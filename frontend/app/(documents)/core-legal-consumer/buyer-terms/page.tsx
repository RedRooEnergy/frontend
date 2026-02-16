import type { Metadata } from "next";
import DocumentPageLayout from "../../../../components/DocumentPageLayout";

const titleText = "Buyer Terms";
const description = "Plain-language overview of buyer terms for RedRooEnergy marketplace participants.";

export const metadata: Metadata = {
  title: `${titleText} | RedRooEnergy`,
  description,
  alternates: {
    canonical: "/core-legal-consumer/buyer-terms",
  },
};

const meta = { lastUpdated: "2026-02-04", version: "v1.0" };

export default function Page() {
  const sections = [
    {
      heading: "Overview",
      paragraphs: [
        "RedRooEnergy provides Buyer Terms to explain how purchasing works on the platform and what buyers can expect when placing orders. These terms exist to keep transactions clear, consistent, and fair.",
      ],
    },
    {
      heading: "What you should know",
      paragraphs: [
        "RedRooEnergy operates as a marketplace, not as a manufacturer or installer. Buyers purchase products from independent suppliers through the platform. Orders, payments, delivery, and supporting documents follow defined processes so expectations are clear from the outset.",
      ],
    },
    {
      heading: "Scope and intent",
      paragraphs: [
        "This page explains Buyer Terms in plain language. It is not legal advice. The formal Buyer Terms remain the binding document. This summary is intended to help buyers understand the intent behind those terms.",
      ],
    },
    {
      heading: "Buyer responsibilities",
      paragraphs: [],
      bullets: [
        "Buyers are expected to provide accurate information when creating accounts and placing orders.",
        "Buyers should review product details, pricing, and delivery information before confirming an order.",
        "Buyers are responsible for ensuring the products they select are suitable for their intended project or application.",
      ],
    },
    {
      heading: "What buyers can expect",
      paragraphs: [],
      bullets: [
        "Products listed on RedRooEnergy have been reviewed against relevant Australian requirements before being made available.",
        "Orders follow a structured process with visible status updates.",
        "Records such as invoices and order details are retained in the buyer's account for reference.",
      ],
    },
    {
      heading: "Operational guardrails",
      paragraphs: [
        "All buyer transactions are completed through the platform. Informal arrangements, off-platform payments, or undocumented changes are not supported. This helps ensure transparency and consistent handling of orders.",
      ],
    },
    {
      heading: "How this applies on RedRooEnergy",
      paragraphs: [
        "In practice, Buyer Terms help set clear expectations. Buyers can place orders knowing how the marketplace works, what their responsibilities are, and how RedRooEnergy supports a predictable purchasing experience.",
      ],
    },
  ];

  return (
    <DocumentPageLayout
      title={titleText}
      subtitle="What buyers should understand when using RedRooEnergy."
      meta={meta}
      sections={sections}
    />
  );
}
