import FooterPageLayout from "../../../components/FooterPageLayout";

export default function Page() {
  const sections = [
    {
      heading: "Overview",
      paragraphs: [
        "RedRooEnergy publishes a set of policies and disclosures so users can clearly understand how the marketplace operates. These documents explain expectations, responsibilities, and how certain matters are handled on the platform.",
      ],
    },
    {
      heading: "What you should know",
      paragraphs: [
        "Policies and disclosures are not hidden or informal. They are provided so buyers, suppliers, and service partners can see how the marketplace is run and what standards apply. Together, they form the reference points that guide day-to-day use of RedRooEnergy.",
      ],
    },
    {
      heading: "Scope and intent",
      paragraphs: [
        "This page acts as a central reference. It is not meant to overwhelm users with detail, but to point them to the right information when they need it. Each linked policy explains a specific area in clear terms.",
      ],
    },
    {
      heading: "Stakeholder roles",
      paragraphs: [
        "Buyers can review policies that affect ordering, payments, privacy, and dispute handling.",
        "Suppliers can review policies covering listings, compliance, acceptable use, and ethical expectations.",
        "Service partners can review guidance relevant to delivery, installation, and support roles.",
        "RedRooEnergy maintains and publishes these documents so expectations are transparent.",
      ],
    },
    {
      heading: "Operational guardrails",
      paragraphs: [
        "Policies and disclosures are kept up to date and applied consistently across the platform. They support fair treatment, clear processes, and reliable operation of the marketplace.",
      ],
    },
    {
      heading: "How this applies on RedRooEnergy",
      paragraphs: [
        "In practice, this page gives users a single place to understand how the marketplace works at a policy level. It supports confidence and clarity by making key information easy to find and easy to understand.",
      ],
    },
  ];

  return (
    <FooterPageLayout
      title={"Policies & Disclosures"}
      subtitle="Where to find the key rules and statements that guide RedRooEnergy."
      sections={sections}
    />
  );
}
