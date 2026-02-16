import type { Metadata } from "next";
import DocumentPageLayout from "../../../../components/DocumentPageLayout";

const titleText = "Media & Press Kit";
const description = "Information and resources for media and public reference about the RedRooEnergy marketplace.";

export const metadata: Metadata = {
  title: `${titleText} | RedRooEnergy`,
  description,
  alternates: {
    canonical: "/company-corporate-transparency/media-press-kit",
  },
};

const meta = { lastUpdated: "2026-02-04", version: "v1.0" };

export default function Page() {
  const sections = [
    {
      heading: "Overview",
      paragraphs: [
        "RedRooEnergy provides a Media & Press Kit to support accurate and consistent public communication about the marketplace.",
        "This page is intended for journalists, media outlets, partners, and other third parties seeking background information.",
      ],
    },
    {
      heading: "What you should know",
      paragraphs: [
        "RedRooEnergy operates as a governed renewable energy marketplace focused on approved products for the Australian market.",
        "Public references should reflect this positioning and avoid describing the platform as a manufacturer or informal reseller.",
      ],
    },
    {
      heading: "Scope and intent",
      paragraphs: [
        "This page explains what the Media & Press Kit is for.",
        "It is not a marketing pitch or legal disclosure. Its purpose is to provide reliable reference material that supports clear and factual reporting.",
      ],
    },
    {
      heading: "What the press kit includes",
      paragraphs: [
        "The Media & Press Kit may include an organisation overview, brand description, approved logos and imagery, key messaging, and general marketplace explanations.",
        "These materials are provided to help ensure consistency across public mentions.",
      ],
    },
    {
      heading: "Use of materials",
      paragraphs: [
        "Media assets are provided for editorial and informational use.",
        "They should not be altered in a way that changes meaning or creates misleading impressions about RedRooEnergy or how the marketplace operates.",
      ],
    },
    {
      heading: "How this applies on RedRooEnergy",
      paragraphs: [
        "In practice, this page acts as a single reference point for public-facing information.",
        "It helps ensure that media coverage and external references accurately reflect RedRooEnergy's role, purpose, and operating model.",
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
