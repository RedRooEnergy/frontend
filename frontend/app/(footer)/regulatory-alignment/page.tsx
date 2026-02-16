import FooterPageLayout from "../../../components/FooterPageLayout";

export default function Page() {
  const sections = [
    {
      heading: "Overview",
      paragraphs: [
        "RedRooEnergy is designed to work in line with Australian laws and regulations that apply to renewable energy products and marketplace activity. The aim is to reduce uncertainty for users by building these rules into how the platform operates.",
      ],
    },
    {
      heading: "What you should know",
      paragraphs: [
        "Many products sold in Australia must meet specific regulatory requirements. RedRooEnergy takes these requirements into account before products are listed, helping avoid situations where items are purchased but later found to be unsuitable or restricted.",
      ],
    },
    {
      heading: "Scope and intent",
      paragraphs: [
        "This page explains regulatory alignment in plain language. It is not legal advice. Its purpose is to show that regulations are considered as part of the marketplace design, not left to buyers to figure out on their own.",
      ],
    },
    {
      heading: "Stakeholder roles",
      paragraphs: [
        "Buyers benefit from clearer expectations about what products can be sold and used in Australia.",
        "Suppliers are expected to offer products that meet applicable Australian rules.",
        "Service partners support delivery, installation, and verification within those requirements.",
        "Administrators monitor changes and keep the platform aligned over time.",
      ],
    },
    {
      heading: "Operational guardrails",
      paragraphs: [
        "RedRooEnergy applies consistent checks across listings, documentation, and transactions. Products or processes that fall outside known regulatory expectations are not supported on the platform.",
      ],
    },
    {
      heading: "How this applies on RedRooEnergy",
      paragraphs: [
        "In practice, regulatory alignment means fewer surprises. Buyers can shop with greater confidence, and suppliers operate within a clear, consistent framework that supports lawful and practical outcomes in Australia.",
      ],
    },
  ];

  return (
    <FooterPageLayout
      title={"Regulatory Alignment"}
      subtitle="How RedRooEnergy operates within Australian rules."
      sections={sections}
    />
  );
}
