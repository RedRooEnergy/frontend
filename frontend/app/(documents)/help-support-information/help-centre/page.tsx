import type { Metadata } from "next";
import DocumentPageLayout from "../../../../components/DocumentPageLayout";

const titleText = "Help Centre";
const description = "Public summary for RedRooEnergy marketplace participants covering purpose, scope, responsibilities, and how it applies within the governed platform.";

export const metadata: Metadata = {
  title: `${titleText} | RedRooEnergy`,
  description,
  alternates: {
    canonical: "/help-support-information/help-centre",
  },
};

const meta = { lastUpdated: "2026-01-29", version: "v1.0" };

export default function Page() {
  const sections = [
    {
      heading: "Overview",
      paragraphs: [
        "RedRooEnergy provides a Help Centre so users can find clear answers and support when they need it. The goal is to make the marketplace easy to understand and straightforward to use.",
      ],
    },
    {
      heading: "What you should know",
      paragraphs: [
        "Most questions relate to orders, products, delivery, or account use. The Help Centre is designed to address common issues quickly, without requiring technical knowledge or long explanations.",
      ],
    },
    {
      heading: "Scope and intent",
      paragraphs: [
        "This page explains what the Help Centre is for and how it can assist users. It is not a policy or legal document. Its purpose is to guide users to practical help and information.",
      ],
    },
    {
      heading: "Stakeholder roles",
      paragraphs: [
        "Buyers can find guidance on browsing, ordering, payments, and tracking.",
        "Suppliers can access help related to listings, orders, and fulfilment steps.",
        "Service partners can find information relevant to delivery, installation, or support tasks.",
        "RedRooEnergy maintains the Help Centre to keep information clear and up to date.",
      ],
    },
    {
      heading: "Operational guardrails",
      paragraphs: [
        "Help content is structured and reviewed so information remains accurate and consistent. Where issues cannot be resolved through guidance alone, clear pathways are provided to raise a request or concern.",
      ],
    },
    {
      heading: "How this applies on RedRooEnergy",
      paragraphs: [
        "In practice, the Help Centre is the first place to look when questions arise. It helps users resolve issues quickly and understand how the marketplace works, supporting a smoother experience for everyone.",
      ],
    },
  ];

  return (
    <DocumentPageLayout
      title={titleText}
      subtitle="Support and guidance for using RedRooEnergy."
      meta={meta}
      sections={sections}
    />
  );
}
