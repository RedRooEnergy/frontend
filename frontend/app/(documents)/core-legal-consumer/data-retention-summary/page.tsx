import type { Metadata } from "next";
import DocumentPageLayout from "../../../../components/DocumentPageLayout";

const titleText = "Data Retention Summary";
const description = "Public summary for RedRooEnergy marketplace participants covering purpose, scope, responsibilities, and how it applies within the governed platform.";

export const metadata: Metadata = {
  title: `${titleText} | RedRooEnergy`,
  description,
  alternates: {
    canonical: "/core-legal-consumer/data-retention-summary",
  },
};

const meta = { lastUpdated: "2026-01-29", version: "v1.0" };

export default function Page() {
  const sections = [
    {
      heading: "Overview",
      paragraphs: [
        "RedRooEnergy keeps certain information so the marketplace can operate reliably and meet Australian record-keeping expectations. Data retention simply means keeping the right information for the right amount of time.",
      ],
    },
    {
      heading: "What you should know",
      paragraphs: [
        "Information is not kept forever without reason. Some records must be retained to support orders, payments, warranties, compliance checks, and dispute resolution. Other information is removed or anonymised when it is no longer needed.",
      ],
    },
    {
      heading: "Scope and intent",
      paragraphs: [
        "This page explains data retention in plain language. It is not a legal document. The purpose is to help users understand that information is kept for practical and regulatory reasons, not for unnecessary storage.",
      ],
    },
    {
      heading: "Stakeholder roles",
      paragraphs: [
        "Buyers benefit from access to past orders, invoices, and documents when needed.",
        "Suppliers rely on retained records for fulfilment history, compliance evidence, and support.",
        "Service partners use retained information to confirm delivery, installation, or verification steps.",
        "Administrators manage retention rules so records are kept appropriately and consistently.",
      ],
    },
    {
      heading: "Operational guardrails",
      paragraphs: [
        "RedRooEnergy applies defined retention periods based on the type of information. Access is controlled, and records are managed in an organised way to prevent misuse or unnecessary exposure.",
      ],
    },
    {
      heading: "How this applies on RedRooEnergy",
      paragraphs: [
        "In practice, this means important records remain available when they are needed, while outdated or unnecessary information is not kept indefinitely. This supports transparency, accountability, and a well-managed marketplace.",
      ],
    },
  ];

  return (
    <DocumentPageLayout
      title={titleText}
      subtitle="How long RedRooEnergy keeps information and why."
      meta={meta}
      sections={sections}
    />
  );
}
