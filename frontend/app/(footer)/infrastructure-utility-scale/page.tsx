import FooterPageLayout from "../../../components/FooterPageLayout";

export default function Page() {
  const sections = [
    {
      heading: "Overview",
      paragraphs: [
        "RedRooEnergy supports infrastructure and utility-scale buyers sourcing approved renewable energy equipment for large, complex projects. The marketplace is designed to handle higher volumes, staged delivery, and the documentation expectations typical of utility environments.",
      ],
    },
    {
      heading: "What you should know",
      paragraphs: [
        "Utility-scale projects often involve long timelines, multiple stakeholders, and strict technical and regulatory requirements. RedRooEnergy helps by ensuring products are reviewed before listing and by providing structured ordering and record-keeping throughout the project lifecycle.",
      ],
    },
    {
      heading: "Scope and intent",
      paragraphs: [
        "This page explains, in plain language, how the marketplace supports infrastructure and utility-scale procurement. It is not a technical specification, EPC contract, or regulatory approval document. Its purpose is to outline how the platform fits into large project workflows.",
      ],
    },
    {
      heading: "Who this is for",
      paragraphs: [],
      bullets: [
        "Utility companies and network operators.",
        "Infrastructure developers and project owners.",
        "EPC contractors managing large renewable installations.",
        "Project teams requiring consistent products, repeat orders, and clear records.",
      ],
    },
    {
      heading: "How utility-scale procurement works on RedRooEnergy",
      paragraphs: [
        "Approved products can be selected and ordered through the marketplace, with the ability to manage quantities, delivery stages, and supporting documentation. Orders and updates are tracked so project teams can see progress and maintain alignment across suppliers and partners.",
      ],
    },
    {
      heading: "Operational guardrails",
      paragraphs: [
        "Infrastructure and utility-scale purchases follow the same core marketplace rules as all other transactions. Products must be approved before listing, roles are clearly defined, and all activity is recorded through the platform to support transparency and accountability.",
      ],
    },
    {
      heading: "How this applies on RedRooEnergy",
      paragraphs: [
        "In practice, RedRooEnergy helps large-scale projects reduce uncertainty and coordination overhead. By handling product approvals and maintaining structured records, the platform allows project teams to focus on delivery, integration, and long-term performance.",
      ],
    },
  ];

  return (
    <FooterPageLayout
      title={"Infrastructure & Utility-Scale"}
      subtitle="Supporting large-scale renewable energy projects."
      sections={sections}
    />
  );
}
