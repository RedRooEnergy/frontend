import type { Metadata } from "next";
import DocumentPageLayout from "../../../../components/DocumentPageLayout";

const titleText = "Dispute Resolution";
const description = "Public summary for RedRooEnergy marketplace participants covering purpose, scope, responsibilities, and how it applies within the governed platform.";

export const metadata: Metadata = {
  title: `${titleText} | RedRooEnergy`,
  description,
  alternates: {
    canonical: "/commerce-orders-payments/dispute-resolution",
  },
};

const meta = { lastUpdated: "2026-01-29", version: "v1.0" };

export default function Page() {
  const sections = [
    {
      heading: "Overview",
      paragraphs: [
        "RedRooEnergy provides a clear process for handling disputes related to orders, payments, or fulfilment. The aim is to resolve issues fairly, based on facts recorded in the marketplace.",
      ],
    },
    {
      heading: "What you should know",
      paragraphs: [
        "Disputes can happen, such as delivery delays, incorrect items, or payment concerns. RedRooEnergy does not rely on private messages or informal agreements to resolve these matters. Issues are handled through the platform so there is a clear record of what occurred.",
      ],
    },
    {
      heading: "Scope and intent",
      paragraphs: [
        "This page explains, in everyday language, how dispute resolution works on RedRooEnergy. It is not legal advice. Its purpose is to show that there is a structured way to deal with problems if they arise.",
      ],
    },
    {
      heading: "Stakeholder roles",
      paragraphs: [
        "Buyers can raise disputes and provide supporting information.",
        "Suppliers are expected to respond and work toward resolution.",
        "Service partners may assist where disputes involve delivery, installation, or verification.",
        "Administrators oversee the process to ensure disputes are handled consistently and fairly.",
      ],
    },
    {
      heading: "Operational guardrails",
      paragraphs: [
        "RedRooEnergy uses defined steps to log disputes, review information, and reach an outcome. Relevant records such as orders, payments, and delivery confirmations are used to guide decisions.",
      ],
    },
    {
      heading: "How this applies on RedRooEnergy",
      paragraphs: [
        "In practice, disputes are managed within the platform, not off to the side. This helps reduce confusion, keeps communication clear, and allows issues to be resolved based on documented facts rather than assumptions.",
      ],
    },
  ];

  return (
    <DocumentPageLayout
      title={titleText}
      subtitle="How RedRooEnergy helps resolve order and payment issues."
      meta={meta}
      sections={sections}
    />
  );
}
