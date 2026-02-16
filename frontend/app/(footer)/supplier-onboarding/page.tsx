import FooterPageLayout from "../../../components/FooterPageLayout";

export default function Page() {
  const sections = [
    {
      heading: "Overview",
      paragraphs: [
        "RedRooEnergy uses a structured onboarding process to ensure suppliers are set up correctly before listing products. The goal is to create a reliable marketplace where buyers see approved products and suppliers know exactly what is expected.",
      ],
    },
    {
      heading: "What you should know",
      paragraphs: [
        "Supplier onboarding is not instant or informal. It is designed to confirm business details, product suitability, and supporting documentation upfront. This helps avoid delays, rework, or issues after products are listed or orders are placed.",
      ],
    },
    {
      heading: "Scope and intent",
      paragraphs: [
        "This page explains the supplier onboarding process in plain language. It is not a contract or approval notice. Formal supplier terms and agreements remain the authoritative documents.",
      ],
    },
    {
      heading: "Steps in the supplier onboarding process",
      paragraphs: [],
      bullets: [
        "Create a supplier account and provide basic business information.",
        "Confirm contact details and authorised representatives.",
        "Submit required business and compliance information relevant to your role.",
        "Complete product submission for review before listing.",
        "Receive confirmation once onboarding requirements are met.",
      ],
    },
    {
      heading: "What suppliers are asked to provide",
      paragraphs: [
        "Suppliers may be asked to provide business identification details, certifications, and product documentation depending on the products they intend to list. This information is used only to support marketplace operation, product review, and record keeping.",
      ],
    },
    {
      heading: "Operational guardrails",
      paragraphs: [
        "Suppliers must complete onboarding before products can be listed or orders accepted. All onboarding steps are handled within the platform and recorded. Off-platform or informal onboarding is not supported.",
      ],
    },
    {
      heading: "How this applies on RedRooEnergy",
      paragraphs: [
        "In practice, supplier onboarding helps create a predictable and professional marketplace. By completing setup once, suppliers can list products, receive orders, and fulfil them with confidence, knowing the platform supports clear processes and consistent standards.",
      ],
    },
  ];

  return (
    <FooterPageLayout
      title={"Supplier Onboarding"}
      subtitle="Getting started on RedRooEnergy as a supplier."
      sections={sections}
    />
  );
}
