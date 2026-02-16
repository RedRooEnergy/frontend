import type { Metadata } from "next";
import DocumentPageLayout from "../../../../components/DocumentPageLayout";
import FaqAccordion from "../../../../components/FaqAccordion";

const titleText = "Frequently Asked Questions (FAQs)";
const description = "Public summary for RedRooEnergy marketplace participants covering purpose, scope, responsibilities, and how it applies within the governed platform.";

export const metadata: Metadata = {
  title: `${titleText} | RedRooEnergy`,
  description,
  alternates: {
    canonical: "/help-support-information/faqs",
  },
};

const meta = { lastUpdated: "2026-01-29", version: "v1.0" };

export default function Page() {
  const sections = [
    {
      heading: "Overview",
      paragraphs: [
        "RedRooEnergy provides this FAQ section to help users quickly understand how the marketplace works. It covers common questions without requiring detailed reading or technical knowledge.",
      ],
    },
    {
      heading: "What you should know",
      paragraphs: [
        "The FAQs are designed for everyday use. They focus on the most common topics, such as products, orders, payments, delivery, and general platform use. If a question comes up often, it is likely addressed here.",
      ],
    },
    {
      heading: "Scope and intent",
      paragraphs: [
        "This page explains the purpose of the FAQ section. It is not a policy or legal document. Its role is to give clear, simple explanations and point users in the right direction when more detail is needed.",
      ],
    },
    {
      heading: "Stakeholder roles",
      paragraphs: [
        "Buyers can find quick answers about browsing, ordering, and tracking purchases.",
        "Suppliers can review common questions about listings, approvals, and fulfilment.",
        "Service partners can find general guidance related to their involvement on the platform.",
        "RedRooEnergy maintains the FAQs so information remains current and easy to understand.",
      ],
    },
    {
      heading: "Operational guardrails",
      paragraphs: [
        "FAQ content is reviewed and updated to reflect how the marketplace actually operates. Where questions go beyond general guidance, users are directed to the appropriate help or policy pages.",
      ],
    },
    {
      heading: "How this applies on RedRooEnergy",
      paragraphs: [
        "In practice, the FAQs help users resolve simple questions quickly. This reduces confusion, saves time, and makes it easier to use the marketplace with confidence.",
      ],
    },
  ];

  return (
    <DocumentPageLayout
      title={titleText}
      subtitle="Quick answers to common questions about RedRooEnergy."
      meta={meta}
      sections={sections}
    >
      <FaqAccordion />
    </DocumentPageLayout>
  );
}
