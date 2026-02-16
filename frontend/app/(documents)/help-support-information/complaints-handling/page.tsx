import type { Metadata } from "next";
import DocumentPageLayout from "../../../../components/DocumentPageLayout";

const titleText = "Complaints Handling";
const description = "Public summary for RedRooEnergy marketplace participants covering purpose, scope, responsibilities, and how it applies within the governed platform.";

export const metadata: Metadata = {
  title: `${titleText} | RedRooEnergy`,
  description,
  alternates: {
    canonical: "/help-support-information/complaints-handling",
  },
};

const meta = { lastUpdated: "2026-01-29", version: "v1.0" };

export default function Page() {
  const sections = [
    {
      heading: "Overview",
      paragraphs: [
        "RedRooEnergy provides a clear way for users to raise concerns about their experience on the platform. Complaints handling means there is a defined path for issues to be heard, reviewed, and addressed properly.",
      ],
    },
    {
      heading: "What you should know",
      paragraphs: [
        "If something does not feel right, users are not expected to ignore it or resolve it privately. Complaints can be raised through the platform so they are acknowledged and handled in an organised way. This helps ensure concerns are taken seriously.",
      ],
    },
    {
      heading: "Scope and intent",
      paragraphs: [
        "This page explains, in simple terms, how complaints are managed on RedRooEnergy. It is not legal advice. Its purpose is to reassure users that there is a fair and structured process for raising concerns.",
      ],
    },
    {
      heading: "Stakeholder roles",
      paragraphs: [
        "Buyers can submit complaints about orders, products, or service experiences.",
        "Suppliers are expected to respond to complaints related to their listings or fulfilment.",
        "Service partners may be involved where delivery, installation, or verification is part of the issue.",
        "Administrators oversee the process to ensure complaints are reviewed consistently.",
      ],
    },
    {
      heading: "Operational guardrails",
      paragraphs: [
        "RedRooEnergy uses defined steps to receive complaints, review information, and determine outcomes. Relevant records are used to understand what happened and to guide responses, rather than relying on assumptions.",
      ],
    },
    {
      heading: "How this applies on RedRooEnergy",
      paragraphs: [
        "In practice, complaints are handled within the platform, with clear communication and tracking. Users know where to raise concerns and can trust that issues will be reviewed in a structured and transparent way.",
      ],
    },
  ];

  return (
    <DocumentPageLayout
      title={titleText}
      subtitle="How RedRooEnergy listens and responds to concerns."
      meta={meta}
      sections={sections}
    />
  );
}
