import type { Metadata } from "next";
import DocumentPageLayout from "../../../../components/DocumentPageLayout";

const titleText = "Contact";
const description = "Public summary for RedRooEnergy marketplace participants covering purpose, scope, responsibilities, and how it applies within the governed platform.";

export const metadata: Metadata = {
  title: `${titleText} | RedRooEnergy`,
  description,
  alternates: {
    canonical: "/help-support-information/contact",
  },
};

const meta = { lastUpdated: "2026-01-29", version: "v1.0" };

export default function Page() {
  const sections = [
    {
      heading: "Overview",
      paragraphs: [
        "RedRooEnergy provides clear contact pathways so users know where to go when they need help, information, or follow-up. The aim is to keep communication simple and organised.",
      ],
    },
    {
      heading: "What you should know",
      paragraphs: [
        "Most questions can be resolved through the Help Centre, FAQs, or guides. If you still need assistance, contacting RedRooEnergy allows your request to be reviewed and directed to the right area.",
      ],
    },
    {
      heading: "Scope and intent",
      paragraphs: [
        "This page explains how and when to contact RedRooEnergy. It is not a complaints or dispute page. Its purpose is to help users reach the appropriate support channel without confusion.",
      ],
    },
    {
      heading: "Stakeholder roles",
      paragraphs: [
        "Buyers may contact support about orders, accounts, or general marketplace questions.",
        "Suppliers may contact support regarding onboarding, listings, or order processes.",
        "Service partners may contact support about role access or task-related queries.",
        "RedRooEnergy uses contact requests to provide guidance or direct issues to the correct process.",
      ],
    },
    {
      heading: "Operational guardrails",
      paragraphs: [
        "Contact requests are handled through defined channels so information is recorded and followed up properly. This helps ensure responses are consistent and issues are not lost or overlooked.",
      ],
    },
    {
      heading: "How this applies on RedRooEnergy",
      paragraphs: [
        "In practice, contacting RedRooEnergy provides a clear starting point when you need help beyond self-service content. Requests are reviewed and responded to in a structured way, supporting a reliable support experience for all users.",
      ],
    },
  ];

  return (
    <DocumentPageLayout
      title={titleText}
      subtitle="How to get in touch with RedRooEnergy."
      meta={meta}
      sections={sections}
    />
  );
}
