import FooterPageLayout from "../../../components/FooterPageLayout";

export default function Page() {
  const sections = [
    {
      heading: "Overview",
      paragraphs: [
        "RedRooEnergy is a renewable energy marketplace built to make buying approved products simpler and more predictable. The platform focuses on ensuring that products offered have been checked against Australian requirements before they appear on the marketplace.",
      ],
    },
    {
      heading: "What you should know",
      paragraphs: [
        "Products listed on RedRooEnergy are not random or unverified. Before a product can be sold, it must meet the relevant Australian certification and compliance requirements for its category. This helps buyers avoid uncertainty and reduces the risk of purchasing products that cannot be legally installed or used in Australia.",
      ],
    },
    {
      heading: "Scope and intent",
      paragraphs: [
        "This page is here to explain, in plain terms, what RedRooEnergy stands for. It is not legal advice. Its purpose is to give everyday users confidence that the marketplace applies consistent checks and standards behind the scenes.",
      ],
    },
    {
      heading: "Stakeholder roles",
      paragraphs: [
        "Different people use RedRooEnergy in different ways. Buyers look for compliant products, suppliers list approved equipment, and service partners support delivery, installation, and verification. Each group has a clear role so that products move from order to delivery in an organised and transparent way.",
      ],
    },
    {
      heading: "Operational guardrails",
      paragraphs: [
        "RedRooEnergy uses built-in checks to make sure products, documents, and transactions follow agreed rules. These checks exist to keep the marketplace fair, reliable, and easy to use, without requiring buyers to understand complex compliance details.",
      ],
    },
    {
      heading: "How this applies on RedRooEnergy",
      paragraphs: [
        "On RedRooEnergy, compliance checks happen before products are listed, not after problems arise. This means buyers can focus on choosing the right product, knowing that the marketplace has already taken care of the approval and verification steps in the background.",
      ],
    },
  ];

  return (
    <FooterPageLayout
      title={"About RedRooEnergy"}
      subtitle="Informational guidance for RedRooEnergy participants."
      sections={sections}
    />
  );
}
