import FooterPageLayout from "../../../components/FooterPageLayout";

export default function Page() {
  const sections = [
    {
      heading: "Overview",
      paragraphs: [
        "RedRooEnergy supports commercial and industrial buyers seeking approved renewable energy products for larger, more complex projects. The marketplace is designed to handle higher volumes, repeat purchasing, and structured documentation requirements.",
      ],
    },
    {
      heading: "What you should know",
      paragraphs: [
        "Commercial and industrial projects often involve multiple sites, higher-capacity equipment, and stricter documentation needs. RedRooEnergy is built to support these requirements by ensuring products are reviewed before listing and orders follow clear, trackable processes.",
      ],
    },
    {
      heading: "Scope and intent",
      paragraphs: [
        "This page explains how the marketplace supports commercial and industrial use cases in plain language. It is not a technical design guide or contractual document. Its purpose is to show how larger buyers can use the platform confidently.",
      ],
    },
    {
      heading: "Who this is for",
      paragraphs: [],
      bullets: [
        "Businesses installing renewable energy systems across one or more sites.",
        "Industrial operators requiring compliant, high-capacity equipment.",
        "Project managers coordinating procurement for commercial developments.",
        "Organisations seeking consistent products and records across multiple orders.",
      ],
    },
    {
      heading: "How commercial and industrial buying works on RedRooEnergy",
      paragraphs: [
        "Buyers can select approved products, place structured orders, and manage delivery through the platform. Grouped or repeat purchases can be coordinated to maintain consistency across projects, with records retained for reference and reporting.",
      ],
    },
    {
      heading: "Operational guardrails",
      paragraphs: [
        "Commercial and industrial purchases follow the same marketplace rules as all other orders. Products must meet approval requirements, roles are clearly defined, and transactions are completed through the platform to maintain transparency and accountability.",
      ],
    },
    {
      heading: "How this applies on RedRooEnergy",
      paragraphs: [
        "In practice, RedRooEnergy helps commercial and industrial buyers reduce uncertainty. By handling product approvals and maintaining clear order records, the platform allows businesses to focus on project delivery rather than navigating regulatory or procurement complexity.",
      ],
    },
  ];

  return (
    <FooterPageLayout
      title={"Commercial & Industrial"}
      subtitle="Renewable energy solutions for business and large-scale projects."
      sections={sections}
    />
  );
}
