import FooterPageLayout from "../../../components/FooterPageLayout";

export default function Page() {
  const sections = [
    {
      heading: "Overview",
      paragraphs: [
        "RedRooEnergy uses secure system connections, called APIs, to make the marketplace work smoothly. These connections allow different services to talk to each other so orders, payments, and updates happen automatically.",
      ],
    },
    {
      heading: "What you should know",
      paragraphs: [
        "API integrations are not something most users need to manage or understand. They operate in the background to support everyday actions like placing orders, processing payments, tracking deliveries, and keeping records up to date.",
      ],
    },
    {
      heading: "Scope and intent",
      paragraphs: [
        "This page explains, in simple terms, why integrations exist and how they help the marketplace run reliably. It is not technical documentation and is not intended for developers.",
      ],
    },
    {
      heading: "Stakeholder roles",
      paragraphs: [
        "Buyers benefit from smooth checkout, order tracking, and updates.",
        "Suppliers rely on integrations to receive orders, manage fulfilment, and update order status.",
        "Service partners use connected systems to handle logistics, compliance checks, or supporting services.",
        "Administrators oversee these connections to ensure they operate as intended.",
      ],
    },
    {
      heading: "Operational guardrails",
      paragraphs: [
        "Only approved systems are connected to RedRooEnergy. Integrations are limited to specific purposes and do not have open or unrestricted access. This helps keep information accurate and prevents unexpected system behaviour.",
      ],
    },
    {
      heading: "How this applies on RedRooEnergy",
      paragraphs: [
        "On RedRooEnergy, integrations quietly handle the technical work so users do not have to. Payments confirm automatically, order updates flow through the system, and records stay aligned. The result is a marketplace that feels simple to use, even though multiple systems are working together in the background.",
      ],
    },
  ];

  return (
    <FooterPageLayout
      title={"API Integrations"}
      subtitle="How RedRooEnergy connects systems behind the scenes."
      sections={sections}
    />
  );
}
