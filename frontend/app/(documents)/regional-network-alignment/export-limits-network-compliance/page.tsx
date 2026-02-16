import type { Metadata } from "next";
import DocumentPageLayout from "../../../../components/DocumentPageLayout";

const titleText = "Export Limits __TITLE__ Network Compliance";
const description = "Public summary for RedRooEnergy marketplace participants covering purpose, scope, responsibilities, and how it applies within the governed platform.";

export const metadata: Metadata = {
  title: `${titleText} | RedRooEnergy`,
  description,
  alternates: {
    canonical: "/regional-network-alignment/export-limits-network-compliance",
  },
};

const meta = { lastUpdated: "2026-01-29", version: "v1.0" };

export default function Page() {
  const sections = [
    {
      heading: "Purpose & Scope",
      paragraphs: [
        "This document provides a public overview of the topic for participants in the RedRooEnergy governed marketplace.",
        "It is intended for buyers, suppliers, service partners, and platform stakeholders who need clarity on expectations and boundaries.",
      ],
    },
    {
      heading: "Core Information",
      paragraphs: [
        "Key considerations are outlined in concise language to aid understanding and reduce ambiguity.",
        "Operational specifics may be governed elsewhere; this page focuses on clear, user-facing guidance.",
      ],
      bullets: [
        "Roles and responsibilities",
        "Applicable boundaries",
        "Interaction points within the marketplace",
      ],
    },
    {
      heading: "Applicability on RedRooEnergy",
      paragraphs: [
        "This applies to marketplace participants operating within Australia under the platform's governance model.",
        "It should be read as an informational summary, not as a contract or enforcement instrument.",
      ],
    },
    {
      heading: "Reference & Transparency",
      paragraphs: [
        "This page is a public summary. Formal governance documents, policies, and agreements prevail where applicable.",
      ],
    },
  ];

  return (
    <DocumentPageLayout
      title={titleText}
      subtitle="Public summary for marketplace participants."
      meta={meta}
      sections={sections}
    />
  );
}
