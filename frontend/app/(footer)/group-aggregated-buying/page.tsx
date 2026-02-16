import FooterPageLayout from "../../../components/FooterPageLayout";

export default function Page() {
  const sections = [
    {
      heading: "Overview",
      paragraphs: [
        "RedRooEnergy supports group and aggregated buying to help multiple buyers combine demand into a single, organised purchasing approach. This model is designed to improve clarity, coordination, and consistency without adding complexity for participants.",
      ],
    },
    {
      heading: "What you should know",
      paragraphs: [
        "Group and aggregated buying allows several buyers to align on product selection and timing while still keeping orders transparent. It is not an informal bulk deal. All products remain approved, pricing is visible, and records are maintained through the platform.",
      ],
    },
    {
      heading: "Scope and intent",
      paragraphs: [
        "This page explains the concept in plain language. It is not a contract or financial offer. Its purpose is to show how RedRooEnergy supports coordinated purchasing in a structured way.",
      ],
    },
    {
      heading: "Who this is for",
      paragraphs: [],
      bullets: [
        "Community or industry groups coordinating shared purchases.",
        "Commercial buyers managing multiple sites or repeat projects.",
        "Organisations seeking consistent products and documentation across orders.",
        "Public or semi-public entities exploring coordinated procurement options.",
      ],
    },
    {
      heading: "How group buying works on RedRooEnergy",
      paragraphs: [
        "Participants are grouped around a defined product or order window. Orders are placed through the marketplace so pricing, quantities, and delivery details remain clear. Each participant's involvement is visible and recorded, avoiding confusion or side arrangements.",
      ],
    },
    {
      heading: "Operational guardrails",
      paragraphs: [
        "Group purchases follow the same marketplace rules as individual orders. Products must be approved before listing, roles are clearly defined, and transactions are completed through the platform. Informal or off-platform commitments are not supported.",
      ],
    },
    {
      heading: "How this applies on RedRooEnergy",
      paragraphs: [
        "In practice, group and aggregated buying helps participants benefit from coordination while keeping everything organised. Buyers gain clarity and consistency, and RedRooEnergy maintains oversight so orders, documentation, and outcomes remain predictable and dependable.",
      ],
    },
  ];

  return (
    <FooterPageLayout
      title={"Group & Aggregated Buying"}
      subtitle="Coordinated purchasing through RedRooEnergy."
      sections={sections}
    />
  );
}
