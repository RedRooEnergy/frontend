import FooterPageLayout from "../../../components/FooterPageLayout";

export default function Page() {
  const sections = [
    {
      heading: "Overview",
      paragraphs: [
        "RedRooEnergy supports clear warranty and service arrangements so buyers know where to turn if support is needed after delivery. The platform connects products with defined warranty terms and recognised service pathways.",
      ],
    },
    {
      heading: "What you should know",
      paragraphs: [
        "RedRooEnergy does not provide warranties itself. Warranties are provided by manufacturers or suppliers, and service is carried out by approved or recognised service providers where applicable. The marketplace helps make these arrangements visible and documented.",
      ],
    },
    {
      heading: "Scope and intent",
      paragraphs: [
        "This page explains, in plain language, how warranty and service support fit into the marketplace. It is not a warranty contract or technical service manual. Its purpose is to set clear expectations about who provides support and how it is accessed.",
      ],
    },
    {
      heading: "Who this is for",
      paragraphs: [],
      bullets: [
        "Buyers who want clarity on warranty coverage and service options.",
        "Suppliers and manufacturers who provide warranty terms and service pathways.",
        "Service providers who support inspection, repair, replacement, or maintenance activities.",
      ],
    },
    {
      heading: "How warranty and service work on RedRooEnergy",
      paragraphs: [
        "Warranty terms are linked to products and made available as part of the listing or order records. If service is required, buyers are directed to the appropriate warranty provider or service partner. Relevant order and product records help confirm eligibility and coverage.",
      ],
    },
    {
      heading: "Operational guardrails",
      paragraphs: [
        "Warranty and service interactions are supported by documented records within the platform. Claims, confirmations, and supporting information are handled through defined processes. Informal or undocumented arrangements are not supported.",
      ],
    },
    {
      heading: "How this applies on RedRooEnergy",
      paragraphs: [
        "In practice, this approach helps buyers access support with fewer delays and less confusion. By keeping warranty information clear and service pathways documented, RedRooEnergy supports predictable after-sales outcomes and ongoing confidence in purchased products.",
      ],
    },
  ];

  return (
    <FooterPageLayout
      title={"Warranty & Service Providers"}
      subtitle="How warranty support and after-sales service work on RedRooEnergy."
      sections={sections}
    />
  );
}
