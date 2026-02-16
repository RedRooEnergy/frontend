import type { Metadata } from "next";
import DocumentPageLayout from "../../../../components/DocumentPageLayout";

const titleText = "Investor & Partner Enquiries";
const description = "Information for investors and strategic partners seeking engagement with RedRooEnergy.";

export const metadata: Metadata = {
  title: `${titleText} | RedRooEnergy`,
  description,
  alternates: {
    canonical: "/company-corporate-transparency/investor-partner-enquiries",
  },
};

const meta = { lastUpdated: "2026-02-04", version: "v1.0" };

export default function Page() {
  const sections = [
    {
      heading: "Overview",
      paragraphs: [
        "RedRooEnergy welcomes enquiries from investors and partners who are interested in the long-term growth of a governed renewable energy marketplace. This page outlines the purpose of investor and partner contact and how enquiries are handled.",
      ],
    },
    {
      heading: "What you should know",
      paragraphs: [
        "RedRooEnergy operates with a structured governance, compliance-led approach. Investor and partner discussions are focused on strategic alignment, capability expansion, and sustainable growth rather than short-term or informal arrangements.",
      ],
    },
    {
      heading: "Scope and intent",
      paragraphs: [
        "This page is intended to support initial enquiries only. It is not an offer document, prospectus, or investment advice. Any formal engagement follows appropriate review and documentation.",
      ],
    },
    {
      heading: "Who this is for",
      paragraphs: [],
      bullets: [
        "Potential investors seeking exposure to a renewable energy marketplace model.",
        "Strategic partners interested in technology, supply chain, logistics, compliance, or regional expansion.",
        "Institutional or commercial organisations exploring collaboration opportunities.",
      ],
    },
    {
      heading: "How enquiries are handled",
      paragraphs: [
        "Enquiries submitted through this page are reviewed and directed to the appropriate internal team. Relevant information may be requested to understand alignment, objectives, and proposed involvement before any further discussion proceeds.",
      ],
    },
    {
      heading: "How this applies on RedRooEnergy",
      paragraphs: [
        "In practice, this page provides a clear and professional entry point for investor and partner engagement. It ensures conversations begin in an organised way and align with RedRooEnergy's governance and long-term operating model.",
      ],
    },
  ];

  return (
    <DocumentPageLayout
      title={titleText}
      subtitle="Information for investors and strategic partners."
      meta={meta}
      sections={sections}
    />
  );
}
