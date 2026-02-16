import FooterPageLayout from "../../../components/FooterPageLayout";

export default function Page() {
  const sections = [
    {
      heading: "Overview",
      paragraphs: [
        "RedRooEnergy uses a simple onboarding process to help buyers set up correctly before placing orders. The aim is to ensure accounts are accurate and ready to support ordering, payments, and record keeping.",
      ],
    },
    {
      heading: "What you should know",
      paragraphs: [
        "Buyer onboarding is designed to be straightforward. It focuses on collecting the basic information needed to use the marketplace properly. This helps avoid delays or issues later when orders are placed.",
      ],
    },
    {
      heading: "Scope and intent",
      paragraphs: [
        "This page explains the buyer onboarding process in plain language. It is not a contract or approval notice. Its purpose is to help buyers understand what is required before they can start purchasing.",
      ],
    },
    {
      heading: "Steps in the buyer onboarding process",
      paragraphs: [],
      bullets: [
        "Create an account by providing basic personal or business details.",
        "Confirm contact information so order updates and notifications can be delivered.",
        "Set up payment details to enable checkout and order processing.",
        "Review key marketplace terms so expectations are clear before ordering.",
      ],
    },
    {
      heading: "What buyers are asked to provide",
      paragraphs: [
        "Depending on how the account is used, buyers may be asked for basic identification or business information. This information is used only to support marketplace operation and record keeping.",
      ],
    },
    {
      heading: "Operational guardrails",
      paragraphs: [
        "Onboarding steps must be completed before orders can be placed. This ensures all buyers start with the correct access and that transactions can be handled smoothly through the platform.",
      ],
    },
    {
      heading: "How this applies on RedRooEnergy",
      paragraphs: [
        "In practice, buyer onboarding helps create a smooth purchasing experience. By completing setup once, buyers can place orders, track progress, and access records confidently whenever they need to use the marketplace.",
      ],
    },
  ];

  return (
    <FooterPageLayout
      title={"Buyer Onboarding Process"}
      subtitle="Getting started on RedRooEnergy as a buyer."
      sections={sections}
    />
  );
}
