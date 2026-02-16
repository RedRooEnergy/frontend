import FooterPageLayout from "../../../components/FooterPageLayout";

export default function Page() {
  const sections = [
    {
      heading: "Overview",
      paragraphs: [
        "RedRooEnergy uses a simple governance framework to make sure the marketplace runs in a consistent and predictable way. In everyday terms, this means there are clear rules so everyone knows what to expect.",
      ],
    },
    {
      heading: "What you should know",
      paragraphs: [
        "The marketplace does not rely on informal decisions or case-by-case handling. Products, sellers, and transactions follow the same set of rules. This helps reduce confusion, prevents unfair treatment, and supports trust for all participants.",
      ],
    },
    {
      heading: "Scope and intent",
      paragraphs: [
        "This page explains the idea of governance in plain language. It is not legal or technical documentation. Its purpose is to help users understand that the marketplace is structured and managed, not improvised.",
      ],
    },
    {
      heading: "Stakeholder roles",
      paragraphs: [
        "Buyers can rely on consistent product and order handling.",
        "Suppliers operate under the same listing and fulfilment expectations.",
        "Service partners work within clear processes for delivery, installation, or verification.",
        "Administrators oversee the system to make sure rules are applied evenly.",
      ],
    },
    {
      heading: "Operational guardrails",
      paragraphs: [
        "RedRooEnergy uses built-in processes to guide how products are approved, how orders move, and how records are kept. These guardrails are there to keep things fair and dependable, without adding extra work for users.",
      ],
    },
    {
      heading: "How this applies on RedRooEnergy",
      paragraphs: [
        "In practice, the governance framework means fewer surprises. Everyone operates under the same structure, actions follow a clear path, and outcomes are predictable. This allows users to focus on buying, selling, or delivering products with confidence in how the marketplace is run.",
      ],
    },
  ];

  return (
    <FooterPageLayout
      title={"Governance Framework"}
      subtitle="How RedRooEnergy keeps the marketplace organised and reliable."
      sections={sections}
    />
  );
}
