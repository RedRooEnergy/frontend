import type { Metadata } from "next";
import DocumentPageLayout from "../../../../components/DocumentPageLayout";

const titleText = "Terms of Service";
const description = "Public summary for RedRooEnergy marketplace participants covering purpose, scope, responsibilities, and how it applies within the governed platform.";

export const metadata: Metadata = {
  title: `${titleText} | RedRooEnergy`,
  description,
  alternates: {
    canonical: "/core-legal-consumer/terms-of-service",
  },
};

const meta = { lastUpdated: "2026-01-29", version: "v1.0" };

export default function Page() {
  const sections = [
    {
      heading: "Overview",
      paragraphs: [
        "RedRooEnergy provides a marketplace where buyers, suppliers, and service partners interact under a common set of rules. The Terms of Service explain the basic conditions for using the platform so everyone understands what is expected.",
      ],
    },
    {
      heading: "What you should know",
      paragraphs: [
        "The Terms of Service set out how the platform may be used, what users are responsible for, and what RedRooEnergy provides. They are not there to complicate things, but to make sure the marketplace operates fairly and consistently for all participants.",
      ],
    },
    {
      heading: "Scope and intent",
      paragraphs: [
        "This page explains the purpose of the Terms of Service in plain language. The full Terms remain the official and binding rules. This summary is provided to help everyday users understand why those terms exist.",
      ],
    },
    {
      heading: "Stakeholder roles",
      paragraphs: [
        "Buyers agree to use the platform properly when placing orders and making payments.",
        "Suppliers agree to list accurate products, meet compliance requirements, and fulfil orders as described.",
        "Service partners agree to perform their role in line with agreed expectations.",
        "RedRooEnergy operates the platform and applies the same rules to all users.",
      ],
    },
    {
      heading: "Operational guardrails",
      paragraphs: [
        "The Terms of Service define acceptable use, account responsibilities, and how issues are handled if rules are not followed. They help prevent misuse of the platform and protect both users and the marketplace.",
      ],
    },
    {
      heading: "How this applies on RedRooEnergy",
      paragraphs: [
        "In practice, accepting the Terms of Service allows you to use the marketplace with clear expectations. They help ensure orders, payments, and interactions follow a consistent structure, giving users confidence that the platform is managed in an organised and dependable way.",
      ],
    },
  ];

  return (
    <DocumentPageLayout
      title={titleText}
      subtitle="How using RedRooEnergy works in everyday terms."
      meta={meta}
      sections={sections}
    />
  );
}
