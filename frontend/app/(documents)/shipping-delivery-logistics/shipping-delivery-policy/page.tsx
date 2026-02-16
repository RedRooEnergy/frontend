import type { Metadata } from "next";
import DocumentPageLayout from "../../../../components/DocumentPageLayout";

const titleText = "Shipping & Delivery Policy";
const description = "How orders are delivered on RedRooEnergy.";

export const metadata: Metadata = {
  title: `${titleText} | RedRooEnergy`,
  description,
  alternates: {
    canonical: "/shipping-delivery-logistics/shipping-delivery-policy",
  },
};

const meta = { lastUpdated: "2026-02-04", version: "v1.0" };

export default function Page() {
  const sections = [
    {
      heading: "Overview",
      paragraphs: [
        "RedRooEnergy uses a structured shipping and delivery approach so buyers know what to expect when an order is placed. This policy explains, in simple terms, how delivery is handled through the marketplace.",
      ],
    },
    {
      heading: "What you should know",
      paragraphs: [
        "Shipping and delivery are not managed informally. Orders placed on RedRooEnergy follow defined delivery terms that are shown during checkout. This helps reduce confusion about responsibilities, timing, and costs.",
      ],
    },
    {
      heading: "Scope and intent",
      paragraphs: [
        "This page explains how shipping and delivery work at a general level. It is not a freight contract or customs guide. Its purpose is to help users understand how delivery fits into the marketplace process.",
      ],
    },
    {
      heading: "How delivery works on RedRooEnergy",
      paragraphs: [
        "Once an order is confirmed, the supplier arranges shipment in line with the agreed delivery terms. Delivery progress is tracked through the platform so buyers can see when goods are dispatched, in transit, and delivered.",
      ],
    },
    {
      heading: "Delivery responsibilities",
      paragraphs: [
        "Delivery responsibilities are defined as part of the order. This may include packaging, freight handling, customs clearance where applicable, and final delivery. These responsibilities are clarified upfront to avoid uncertainty later.",
      ],
    },
    {
      heading: "Operational guardrails",
      paragraphs: [
        "All shipping activity is recorded within the platform. Delivery confirmations, supporting documents, and any exceptions are handled through RedRooEnergy's processes. Off-platform delivery arrangements or undocumented changes are not supported.",
      ],
    },
    {
      heading: "How this applies on RedRooEnergy",
      paragraphs: [
        "In practice, this policy helps ensure deliveries are predictable and traceable. Buyers benefit from clear expectations, and suppliers and logistics partners operate within a consistent framework that supports reliable delivery outcomes.",
      ],
    },
  ];

  return (
    <DocumentPageLayout
      title={titleText}
      subtitle="How orders are delivered on RedRooEnergy."
      meta={meta}
      sections={sections}
    />
  );
}
