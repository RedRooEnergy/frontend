import FooterPageLayout from "../../../components/FooterPageLayout";

export default function Page() {
  const sections = [
    {
      heading: "Overview",
      paragraphs: [
        "RedRooEnergy uses a structured payment and escrow approach to make transactions clearer and more predictable for all parties. The goal is to ensure payments follow the progress of an order rather than relying on informal arrangements.",
      ],
    },
    {
      heading: "What you should know",
      paragraphs: [
        "Payments on RedRooEnergy are not handled casually. When an order is placed, funds are processed through the platform and managed according to defined steps. Escrow simply means that payment handling is aligned with order milestones, helping reduce uncertainty for buyers and suppliers.",
      ],
    },
    {
      heading: "Scope and intent",
      paragraphs: [
        "This page explains the payment and escrow approach in plain language. It is not a financial or legal document. Its purpose is to help users understand how payments are managed within the marketplace.",
      ],
    },
    {
      heading: "Who this is for",
      paragraphs: [],
      bullets: [
        "Buyers who want clarity on when and how payments are processed.",
        "Suppliers who want confidence that payments follow agreed order progress.",
        "Service partners involved in delivery or installation steps that affect order completion.",
        "Administrators overseeing payment flows to ensure consistency.",
      ],
    },
    {
      heading: "How payments and escrow work on RedRooEnergy",
      paragraphs: [
        "When an order is placed, payment is initiated through the platform. Funds are managed in line with the order lifecycle, such as confirmation, fulfilment, and completion. This helps ensure that payments reflect what has actually occurred, rather than being handled off-platform.",
      ],
    },
    {
      heading: "Operational guardrails",
      paragraphs: [
        "All payments are processed through approved payment systems integrated with RedRooEnergy. Payment actions are recorded, and manual side arrangements are not supported. This helps maintain transparency and traceability across transactions.",
      ],
    },
    {
      heading: "How this applies on RedRooEnergy",
      paragraphs: [
        "In practice, payments and escrow help protect all parties. Buyers gain confidence that payments are linked to real progress, and suppliers gain assurance that completed work and delivery are properly recognised within a structured payment flow.",
      ],
    },
  ];

  return (
    <FooterPageLayout
      title={"Payments & Escrow"}
      subtitle="How payments are handled on RedRooEnergy."
      sections={sections}
    />
  );
}
