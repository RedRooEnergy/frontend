import FooterPageLayout from "../../../components/FooterPageLayout";

export default function Page() {
  const sections = [
    {
      heading: "Overview",
      paragraphs: [
        "RedRooEnergy is built around the idea that products should meet Australian standards before they are sold. The marketplace applies compliance checks so buyers can shop with confidence.",
      ],
    },
    {
      heading: "What you should know",
      paragraphs: [
        "Products on RedRooEnergy are not listed first and checked later. Before a product appears on the marketplace, it must meet the relevant Australian certification and regulatory requirements for its type. This reduces the risk of buying equipment that cannot be legally installed or used.",
      ],
    },
    {
      heading: "Scope and intent",
      paragraphs: [
        "This page explains, in plain language, how compliance is handled on RedRooEnergy. It is not a technical or legal guide. Its purpose is to reassure everyday users that standards are taken seriously.",
      ],
    },
    {
      heading: "Stakeholder roles",
      paragraphs: [
        "Buyers benefit from knowing products have already been reviewed.",
        "Suppliers are responsible for providing compliant products and supporting documentation.",
        "Service partners help verify, install, or inspect products where required.",
        "Administrators ensure compliance checks are applied consistently across the marketplace.",
      ],
    },
    {
      heading: "Operational guardrails",
      paragraphs: [
        "RedRooEnergy uses structured checks and documentation requirements to confirm compliance. Products that do not meet required standards are not listed. This approach helps keep the marketplace consistent and dependable.",
      ],
    },
    {
      heading: "How this applies on RedRooEnergy",
      paragraphs: [
        "In practice, this means buyers can focus on selecting the right product without needing to research regulations themselves. The marketplace handles compliance verification in the background so approved products are ready for use in Australia.",
      ],
    },
  ];

  return (
    <FooterPageLayout
      title={"Compliance Standards"}
      subtitle="How RedRooEnergy ensures products meet Australian requirements."
      sections={sections}
    />
  );
}
