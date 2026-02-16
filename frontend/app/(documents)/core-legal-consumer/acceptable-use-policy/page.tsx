import type { Metadata } from "next";
import DocumentPageLayout from "../../../../components/DocumentPageLayout";

const titleText = "Acceptable Use Policy";
const description = "Public summary for RedRooEnergy marketplace participants covering purpose, scope, responsibilities, and how it applies within the governed platform.";

export const metadata: Metadata = {
  title: `${titleText} | RedRooEnergy`,
  description,
  alternates: {
    canonical: "/core-legal-consumer/acceptable-use-policy",
  },
};

const meta = { lastUpdated: "2026-01-29", version: "v1.0" };

export default function Page() {
  const sections = [
    {
      heading: "Overview",
      paragraphs: [
        "RedRooEnergy is provided for legitimate buying, selling, and supporting renewable energy products. The Acceptable Use Policy explains the basic behaviour expected so the marketplace remains reliable and fair for everyone.",
      ],
    },
    {
      heading: "What you should know",
      paragraphs: [
        "The platform must be used responsibly. Activities that misuse the system, misrepresent products, interfere with other users, or attempt to bypass platform rules are not permitted. These rules exist to protect all participants, not to restrict normal use.",
      ],
    },
    {
      heading: "Scope and intent",
      paragraphs: [
        "This page explains acceptable use in plain language. The full Acceptable Use Policy is the official and binding document. This summary helps everyday users understand why certain behaviours are not allowed.",
      ],
    },
    {
      heading: "Stakeholder roles",
      paragraphs: [
        "Buyers are expected to place genuine orders and use the platform honestly.",
        "Suppliers must provide accurate product information and use the marketplace for approved commercial purposes.",
        "Service partners must interact with the platform only in ways relevant to their role.",
        "RedRooEnergy monitors use of the platform to ensure rules are followed consistently.",
      ],
    },
    {
      heading: "Operational guardrails",
      paragraphs: [
        "System controls are in place to prevent misuse, protect data, and maintain platform stability. Accounts or activities that breach acceptable use rules may be restricted or suspended.",
      ],
    },
    {
      heading: "How this applies on RedRooEnergy",
      paragraphs: [
        "In practice, acceptable use means using the platform as intended, treating other participants fairly, and respecting the rules that keep the marketplace organised. This helps ensure RedRooEnergy remains dependable and usable for all participants.",
      ],
    },
  ];

  return (
    <DocumentPageLayout
      title={titleText}
      subtitle="How RedRooEnergy expects the platform to be used."
      meta={meta}
      sections={sections}
    />
  );
}
