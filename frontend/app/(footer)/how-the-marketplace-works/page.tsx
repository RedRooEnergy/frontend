import FooterPageLayout from "../../../components/FooterPageLayout";

export default function Page() {
  const sections = [
    {
      heading: "Overview",
      paragraphs: [
        "RedRooEnergy is designed to make buying and supplying renewable energy products straightforward. The marketplace brings together approved products, clear pricing, and structured delivery so participants know what to expect at each step.",
      ],
    },
    {
      heading: "What you should know",
      paragraphs: [
        "RedRooEnergy is not a classifieds site or an open trading board. Products are reviewed before they are listed, and transactions follow a defined process. This helps reduce confusion, delays, and unexpected issues for both buyers and suppliers.",
      ],
    },
    {
      heading: "Scope and intent",
      paragraphs: [
        "This page explains, in plain language, how orders move through the marketplace. It is intended to help everyday users understand the flow from browsing to delivery, without needing technical or legal knowledge.",
      ],
    },
    {
      heading: "Stakeholder roles",
      paragraphs: [
        "Buyers browse and purchase approved products.",
        "Suppliers list products that meet Australian requirements and fulfil orders when purchased.",
        "Service partners, such as logistics and installers, support delivery and completion where required.",
        "Each role has a clear purpose so responsibilities do not overlap or become unclear.",
      ],
    },
    {
      heading: "Operational guardrails",
      paragraphs: [
        "The marketplace uses built-in steps to guide orders from payment through to delivery. Pricing, documentation, and order status are handled within the platform to keep everything visible and consistent. This avoids side arrangements and helps ensure orders are completed as expected.",
      ],
    },
    {
      heading: "How this applies on RedRooEnergy",
      paragraphs: [
        "On RedRooEnergy, orders follow a clear path: choose a product, place an order, payment is processed, the supplier fulfils the order, and delivery or installation is completed. Throughout this process, the platform tracks progress so buyers and suppliers can see what is happening at each stage, without guesswork.",
      ],
    },
  ];

  return (
    <FooterPageLayout
      title={"How the Marketplace Works"}
      subtitle="A simple guide to using RedRooEnergy."
      sections={sections}
    />
  );
}
