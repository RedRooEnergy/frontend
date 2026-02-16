import type { Metadata } from "next";
import DocumentPageLayout from "../../../../components/DocumentPageLayout";

const titleText = "Supplier Terms";
const description = "Plain-language overview of supplier terms for RedRooEnergy marketplace participants.";

export const metadata: Metadata = {
  title: `${titleText} | RedRooEnergy`,
  description,
  alternates: {
    canonical: "/core-legal-consumer/supplier-terms",
  },
};

const meta = { lastUpdated: "2026-02-04", version: "v1.0" };

export default function Page() {
  const sections = [
    {
      heading: "Overview",
      paragraphs: [
        "RedRooEnergy provides Supplier Terms to explain how supplying products through the marketplace works and what is expected from suppliers. These terms exist to keep listings, orders, and fulfilment consistent and reliable.",
      ],
    },
    {
      heading: "What you should know",
      paragraphs: [
        "RedRooEnergy operates as a marketplace, not a buyer of goods. Suppliers sell directly to buyers through the platform under defined processes. Products must meet applicable Australian requirements before being listed, and orders must be fulfilled as described.",
      ],
    },
    {
      heading: "Scope and intent",
      paragraphs: [
        "This page explains Supplier Terms in plain language. It is not legal advice. The formal Supplier Terms and agreements remain the binding documents. This summary is intended to clarify expectations and responsibilities.",
      ],
    },
    {
      heading: "Supplier responsibilities",
      paragraphs: [],
      bullets: [
        "Provide accurate product information and supporting documentation.",
        "Ensure products listed meet applicable Australian standards and requirements.",
        "Fulfil orders in line with agreed delivery terms and timelines.",
        "Use the platform for all order-related communication and documentation.",
      ],
    },
    {
      heading: "What suppliers can expect",
      paragraphs: [],
      bullets: [
        "A structured listing and approval process before products are visible to buyers.",
        "Clear order details and fulfilment instructions through the supplier dashboard.",
        "Transparent records of orders, deliveries, and settlements.",
        "Consistent application of marketplace rules across all suppliers.",
      ],
    },
    {
      heading: "Operational guardrails",
      paragraphs: [
        "All supplier activity is conducted through the platform. Off-platform arrangements, undocumented changes, or informal fulfilment practices are not supported. This helps maintain transparency, traceability, and fair treatment across the marketplace.",
      ],
    },
    {
      heading: "How this applies on RedRooEnergy",
      paragraphs: [
        "In practice, Supplier Terms help create a predictable operating environment. Suppliers know what is required to list and fulfil products, and buyers can rely on consistent standards across the marketplace.",
      ],
    },
  ];

  return (
    <DocumentPageLayout
      title={titleText}
      subtitle="What suppliers should understand when using RedRooEnergy."
      meta={meta}
      sections={sections}
    />
  );
}
