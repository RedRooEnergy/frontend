import FooterPageLayout from "../../../components/FooterPageLayout";

export default function Page() {
  const sections = [
    {
      heading: "Overview",
      paragraphs: [
        "RedRooEnergy provides Onboarding Guides to help new users join the marketplace in a clear and organised way. These guides explain what is required before you can actively use the platform.",
      ],
    },
    {
      heading: "What you should know",
      paragraphs: [
        "Onboarding is not instant or informal. Depending on your role, you may need to provide basic details, confirm your business information, or upload supporting documents. Onboarding Guides explain these steps clearly so there are no surprises.",
      ],
    },
    {
      heading: "Scope and intent",
      paragraphs: [
        "This page explains the purpose of onboarding guidance. It is not an approval notice or legal document. Its role is to prepare users for what is required to gain access and start using the marketplace.",
      ],
    },
    {
      heading: "Stakeholder roles",
      paragraphs: [
        "Buyers follow onboarding steps to create an account and enable ordering.",
        "Suppliers follow onboarding steps to verify their business and submit products for approval.",
        "Service partners follow onboarding steps relevant to logistics, installation, or compliance roles.",
        "RedRooEnergy uses onboarding to ensure participants are correctly set up before transacting.",
      ],
    },
    {
      heading: "How this applies on RedRooEnergy",
      paragraphs: [
        "In practice, Onboarding Guides help users complete setup correctly the first time. This reduces delays later and ensures everyone enters the marketplace with clear expectations and the right access for their role.",
      ],
    },
  ];

  return (
    <FooterPageLayout
      title={"Onboarding Guides"}
      subtitle="Getting started on RedRooEnergy."
      sections={sections}
    />
  );
}
