import FooterPageLayout from "../../../components/FooterPageLayout";

export default function Page() {
  const sections = [
    {
      heading: "Overview",
      paragraphs: [
        "RedRooEnergy provides guides and documentation to help users understand how the marketplace works and how to complete common tasks. The focus is on clear, step-by-step information rather than technical or legal language.",
      ],
    },
    {
      heading: "What you should know",
      paragraphs: [
        "Guides are written to support everyday use of the platform. They explain processes such as onboarding, ordering, compliance checks, delivery, and account management in a straightforward way.",
      ],
    },
    {
      heading: "Scope and intent",
      paragraphs: [
        "This page explains the purpose of guides and documentation. It is not a policy or legal page. Its role is to point users to practical instructions that help them use the marketplace effectively.",
      ],
    },
    {
      heading: "Stakeholder roles",
      paragraphs: [
        "Buyers can access guides on browsing products, placing orders, and tracking deliveries.",
        "Suppliers can follow onboarding and product listing guides.",
        "Service partners can use documentation relevant to delivery, installation, or verification tasks.",
        "RedRooEnergy maintains these materials to keep guidance accurate and easy to follow.",
      ],
    },
    {
      heading: "Operational guardrails",
      paragraphs: [
        "Documentation reflects how the marketplace actually operates. Guides are updated as processes evolve so users are not relying on outdated information.",
      ],
    },
    {
      heading: "How this applies on RedRooEnergy",
      paragraphs: [
        "In practice, guides and documentation reduce confusion and support smoother use of the platform. Users can complete tasks with confidence, knowing clear instructions are available when needed.",
      ],
    },
  ];

  return (
    <FooterPageLayout
      title={"Guides & Documentation"}
      subtitle="Practical guidance for using RedRooEnergy."
      sections={sections}
    />
  );
}
