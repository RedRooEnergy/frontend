import FooterPageLayout from "../../../components/FooterPageLayout";

export default function Page() {
  const sections = [
    {
      heading: "Overview",
      paragraphs: [
        "RedRooEnergy provides Platform Guides to help users understand how to use the marketplace day to day. These guides focus on practical actions rather than policies or rules.",
      ],
    },
    {
      heading: "What you should know",
      paragraphs: [
        "Platform Guides explain how to navigate the site, manage your account, place or fulfil orders, upload documents, and track activity. They are written for everyday users and avoid technical or legal language.",
      ],
    },
    {
      heading: "Scope and intent",
      paragraphs: [
        "This page describes what Platform Guides are for. They are not contracts or compliance documents. Their purpose is to make it easier to use RedRooEnergy correctly and efficiently.",
      ],
    },
    {
      heading: "Stakeholder roles",
      paragraphs: [
        "Buyers use Platform Guides to browse products, place orders, make payments, and track progress.",
        "Suppliers use Platform Guides to manage listings, receive orders, upload documents, and complete fulfilment steps.",
        "Service partners use Platform Guides to understand how to access tasks, submit evidence, and close out work.",
        "RedRooEnergy maintains these guides so instructions match how the platform actually works.",
      ],
    },
    {
      heading: "How this applies on RedRooEnergy",
      paragraphs: [
        "In practice, Platform Guides reduce confusion and save time. When users are unsure what to do next, the guides provide clear, practical direction so tasks can be completed with confidence.",
      ],
    },
  ];

  return (
    <FooterPageLayout
      title={"Platform Guides"}
      subtitle="Step-by-step help for using RedRooEnergy."
      sections={sections}
    />
  );
}
