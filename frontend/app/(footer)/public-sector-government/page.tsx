import FooterPageLayout from "../../../components/FooterPageLayout";

export default function Page() {
  const sections = [
    {
      heading: "Overview",
      paragraphs: [
        "RedRooEnergy supports public sector and government organisations seeking approved renewable energy products through a structured and transparent marketplace. The platform is designed to align with the expectations typically associated with public procurement.",
      ],
    },
    {
      heading: "What you should know",
      paragraphs: [
        "Public sector procurement often requires clear approvals, consistent documentation, and traceable processes. RedRooEnergy is built to support these needs by ensuring products are reviewed before listing and that orders follow defined workflows with recorded outcomes.",
      ],
    },
    {
      heading: "Scope and intent",
      paragraphs: [
        "This page explains how public sector and government organisations can use the marketplace in plain language. It is not a tender document or procurement policy. Its purpose is to outline how the platform supports structured purchasing.",
      ],
    },
    {
      heading: "Who this is for",
      paragraphs: [],
      bullets: [
        "Local, state, and regional government bodies.",
        "Public agencies and authorities managing renewable energy projects.",
        "Government-owned or government-funded organisations.",
        "Project teams requiring consistent products and documented procurement processes.",
      ],
    },
    {
      heading: "How public sector purchasing works on RedRooEnergy",
      paragraphs: [
        "Approved products can be selected and ordered through the marketplace with clear visibility of pricing, delivery status, and supporting documentation. Orders and records are retained to support reporting, review, and internal governance requirements.",
      ],
    },
    {
      heading: "Operational guardrails",
      paragraphs: [
        "All public sector purchases follow the same marketplace rules as other buyers. Products must be approved before listing, roles are clearly defined, and transactions are completed through the platform to maintain transparency and consistency.",
      ],
    },
    {
      heading: "How this applies on RedRooEnergy",
      paragraphs: [
        "In practice, RedRooEnergy helps public sector organisations reduce procurement uncertainty. By providing approved products, structured ordering, and retained records, the platform supports accountable purchasing and long-term project confidence.",
      ],
    },
  ];

  return (
    <FooterPageLayout
      title={"Public Sector & Government"}
      subtitle="Supporting structured procurement for public organisations."
      sections={sections}
    />
  );
}
