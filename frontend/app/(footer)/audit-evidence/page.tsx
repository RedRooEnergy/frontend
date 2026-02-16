import FooterPageLayout from "../../../components/FooterPageLayout";

export default function Page() {
  const sections = [
    {
      heading: "Overview",
      paragraphs: [
        "RedRooEnergy is designed so important actions on the marketplace leave a clear record. This helps ensure transparency and makes it easier to understand what happened, when it happened, and who was involved.",
      ],
    },
    {
      heading: "What you should know",
      paragraphs: [
        "When products are approved, orders are placed, payments are made, or deliveries are completed, the platform records these steps automatically. This is not about paperwork for users, but about keeping reliable records behind the scenes.",
      ],
    },
    {
      heading: "Scope and intent",
      paragraphs: [
        "This page explains, in plain language, how audit records and evidence are handled on RedRooEnergy. It is not an audit manual or legal guide. Its purpose is to reassure users that the marketplace operates with traceable processes.",
      ],
    },
    {
      heading: "Stakeholder roles",
      paragraphs: [
        "Buyers benefit from clear order histories and transaction records.",
        "Suppliers have documented proof of listings, orders, and fulfilment steps.",
        "Service partners can rely on recorded handovers, delivery confirmation, or installation evidence.",
        "Administrators oversee records to ensure the marketplace remains consistent and accountable.",
      ],
    },
    {
      heading: "Operational guardrails",
      paragraphs: [
        "RedRooEnergy captures key actions automatically as part of normal platform use. Records are stored in a structured way and cannot be casually altered or removed. This helps maintain accuracy and trust across the marketplace.",
      ],
    },
    {
      heading: "How this applies on RedRooEnergy",
      paragraphs: [
        "In practice, this means fewer disputes and clearer outcomes. If questions arise, the platform already has the information needed to understand what occurred, allowing issues to be resolved based on recorded facts rather than assumptions.",
      ],
    },
  ];

  return (
    <FooterPageLayout
      title={"Audit & Evidence"}
      subtitle="How RedRooEnergy keeps clear records of marketplace activity."
      sections={sections}
    />
  );
}
