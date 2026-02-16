import FooterPageLayout from "../../components/FooterPageLayout";

export default function Page() {
  const sections = [
    {
      heading: "Overview",
      paragraphs: [
        "RedRooEnergy provides clear and structured ways to make contact so enquiries are handled efficiently and directed to the right place. This page explains when and how to contact the platform.",
      ],
    },
    {
      heading: "What you should know",
      paragraphs: [
        "Most questions can be answered through the Help Centre, FAQs, or Guides. Contacting RedRooEnergy is recommended when you need assistance that cannot be resolved through self-service information.",
      ],
    },
    {
      heading: "Scope and intent",
      paragraphs: [
        "This page explains the purpose of contacting RedRooEnergy. It is not a complaints or dispute page. Its role is to help users reach the appropriate support or information channel without confusion.",
      ],
    },
    {
      heading: "Who should contact us",
      paragraphs: [],
      bullets: [
        "Buyers with questions about accounts, orders, or general marketplace use.",
        "Suppliers with enquiries about onboarding, listings, or fulfilment processes.",
        "Service partners with questions related to their role or assigned tasks.",
        "Media or partners seeking official information or clarification.",
      ],
    },
    {
      heading: "How contact is handled",
      paragraphs: [
        "Contact requests are reviewed and routed internally so they reach the correct team. Information provided through contact forms helps ensure responses are accurate and timely.",
      ],
    },
    {
      heading: "How this applies on RedRooEnergy",
      paragraphs: [
        "In practice, the Contact page provides a clear starting point when additional help is needed. Requests are handled in an organised way, supporting consistent communication and reliable follow-up across the marketplace.",
      ],
    },
  ];

  return (
    <FooterPageLayout
      title={"Contact"}
      subtitle="How to get in touch with RedRooEnergy."
      sections={sections}
    />
  );
}
