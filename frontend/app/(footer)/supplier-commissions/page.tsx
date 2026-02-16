import FooterPageLayout from "../../../components/FooterPageLayout";

export default function Page() {
  const sections = [
    {
      heading: "Overview",
      paragraphs: [
        "RedRooEnergy does not pay commissions and does not charge suppliers commissions. Suppliers are not funding the marketplace through percentage-based deductions from sales.",
      ],
    },
    {
      heading: "What you should know",
      paragraphs: [
        "RedRooEnergy’s marketplace operations are funded by buyers paying a set percentage on the total cost of their orders. This buyer-paid fee supports platform operation and services, while keeping supplier-side costs clear and avoiding commission-style models.",
      ],
    },
    {
      heading: "Scope and intent",
      paragraphs: [
        "This page explains the supplier-side position in plain language. It is not a contract. The formal commercial documents remain the authoritative source for the exact buyer fee percentage and how it is presented at checkout.",
      ],
    },
    {
      heading: "How the marketplace is funded",
      paragraphs: [
        "When a buyer places an order, a set percentage is applied to the total order cost as a buyer-paid marketplace fee. This is handled within the platform so fees are visible, consistent, and recorded.",
      ],
    },
    {
      heading: "What this means for suppliers",
      paragraphs: [
        "Suppliers are paid based on the agreed order value for the goods and services they provide, without a commission deducted by RedRooEnergy. Supplier settlement follows the platform’s standard order and payment process, with clear records available in the supplier dashboard.",
      ],
    },
    {
      heading: "Operational guardrails",
      paragraphs: [
        "All fees are applied inside the platform and shown clearly as part of the buyer’s checkout flow. RedRooEnergy does not support off-platform fee arrangements or informal side agreements.",
      ],
    },
    {
      heading: "How this applies on RedRooEnergy",
      paragraphs: [
        "In practice, suppliers can price and fulfil without worrying about commission deductions. Buyers fund marketplace operations through a predictable percentage fee applied to their total order cost, keeping the commercial model simple and transparent.",
      ],
    },
  ];

  return (
    <FooterPageLayout
      title={"Supplier Fees"}
      subtitle="How operating cost are charged on RedRooEnergy."
      sections={sections}
    />
  );
}
