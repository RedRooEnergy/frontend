import type { Metadata } from "next";
import DocumentPageLayout from "../../../../components/DocumentPageLayout";

const titleText = "Privacy Policy";
const description = "Public summary for RedRooEnergy marketplace participants covering purpose, scope, responsibilities, and how it applies within the governed platform.";

export const metadata: Metadata = {
  title: `${titleText} | RedRooEnergy`,
  description,
  alternates: {
    canonical: "/core-legal-consumer/privacy-policy",
  },
};

const meta = { lastUpdated: "2026-01-29", version: "v1.0" };

export default function Page() {
  const sections = [
    {
      heading: "Overview",
      paragraphs: [
        "RedRooEnergy collects and uses information so the marketplace can operate properly. This includes details needed to create accounts, process orders, manage payments, and support delivery and services.",
      ],
    },
    {
      heading: "What you should know",
      paragraphs: [
        "Only information that is necessary to run the marketplace is collected. Details are not gathered casually or for unrelated reasons. Information is handled carefully and is not sold or shared for general marketing purposes.",
      ],
    },
    {
      heading: "Scope and intent",
      paragraphs: [
        "This page explains the Privacy Policy in plain language. The full Privacy Policy is the official document that sets out how information is collected, used, and protected. This summary is provided to help everyday users understand the intent.",
      ],
    },
    {
      heading: "Stakeholder roles",
      paragraphs: [
        "Buyers provide personal and order details so purchases can be completed and tracked.",
        "Suppliers provide business and contact information to list products and fulfil orders.",
        "Service partners access limited information needed to perform delivery, installation, or verification tasks.",
        "RedRooEnergy manages information to support platform operations and meet legal obligations.",
      ],
    },
    {
      heading: "Operational guardrails",
      paragraphs: [
        "Access to information is restricted based on role. Users see only what they need to see. Systems are designed to reduce unnecessary access and to keep information organised and controlled.",
      ],
    },
    {
      heading: "How this applies on RedRooEnergy",
      paragraphs: [
        "In practice, this means your information is used to support marketplace activity and record keeping, not for unrelated purposes. Users can participate with confidence, knowing their details are handled as part of a structured and responsible platform.",
      ],
    },
  ];

  return (
    <DocumentPageLayout
      title={titleText}
      subtitle="How RedRooEnergy handles personal and business information."
      meta={meta}
      sections={sections}
    />
  );
}
