import FooterPageLayout from "../../../components/FooterPageLayout";

export default function Page() {
  const sections = [
    {
      heading: "Overview",
      paragraphs: [
        "RedRooEnergy operates under a defined corporate structure so responsibilities, ownership, and decision-making are clear. This structure exists to support stable operations, accountability, and long-term operation of the marketplace.",
      ],
    },
    {
      heading: "What you should know",
      paragraphs: [
        "RedRooEnergy is not an informal or personal trading operation. The marketplace is operated through established legal entities with defined roles. This helps ensure that contracts, compliance obligations, and financial activities are handled properly.",
      ],
    },
    {
      heading: "Scope and intent",
      paragraphs: [
        "This page explains the idea of corporate structure in plain language. It is not a legal briefing or corporate disclosure document. Its purpose is to help users understand that the marketplace is backed by a formal business structure.",
      ],
    },
    {
      heading: "How the structure works",
      paragraphs: [
        "Different entities may be responsible for operating the platform, holding intellectual property, managing contracts, or overseeing governance. Each part of the structure has a specific purpose so responsibilities do not overlap or become unclear.",
      ],
    },
    {
      heading: "Why this matters",
      paragraphs: [
        "A clear corporate structure supports trust. It helps buyers, suppliers, and partners understand who operates the marketplace and ensures the platform can meet regulatory, financial, and operational expectations.",
      ],
    },
    {
      heading: "How this applies on RedRooEnergy",
      paragraphs: [
        "In practice, this means the marketplace is run in an organised and accountable way. Users interact with a professionally structured platform rather than an informal arrangement, supporting confidence and continuity over time.",
      ],
    },
  ];

  return (
    <FooterPageLayout
      title={"Corporate Structure"}
      subtitle="How RedRooEnergy is organised."
      sections={sections}
    />
  );
}
