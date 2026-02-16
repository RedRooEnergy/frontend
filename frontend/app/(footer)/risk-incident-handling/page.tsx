import FooterPageLayout from "../../../components/FooterPageLayout";

export default function Page() {
  const sections = [
    {
      heading: "Overview",
      paragraphs: [
        "RedRooEnergy has a clear way of dealing with issues so problems are handled calmly and fairly. Risk and incident handling simply means there is a known process when things do not go as expected.",
      ],
    },
    {
      heading: "What you should know",
      paragraphs: [
        "Delays, damaged goods, missing documents, or order issues can happen. When they do, RedRooEnergy does not rely on private messages or informal fixes. Issues are reported through the platform so they can be reviewed properly.",
      ],
    },
    {
      heading: "Scope and intent",
      paragraphs: [
        "This page explains the approach in plain language. It is not technical or legal guidance. Its purpose is to reassure users that problems are managed in an organised and consistent way.",
      ],
    },
    {
      heading: "Stakeholder roles",
      paragraphs: [
        "Buyers can report issues related to their orders or deliveries.",
        "Suppliers are expected to respond to issues connected to their products or fulfilment.",
        "Service partners may be involved where logistics, installation, or verification is affected.",
        "RedRooEnergy oversees the process to ensure issues are handled fairly.",
      ],
    },
    {
      heading: "Operational guardrails",
      paragraphs: [
        "When an issue is raised, it is logged, reviewed, and tracked. Relevant order and delivery records are used to understand what happened. This helps avoid confusion and keeps decisions based on facts.",
      ],
    },
    {
      heading: "How this applies on RedRooEnergy",
      paragraphs: [
        "In practice, this means users know where to raise concerns and what to expect next. Issues are handled transparently, actions are recorded, and outcomes are clear, helping maintain trust across the marketplace.",
      ],
    },
  ];

  return (
    <FooterPageLayout
      title={"Risk & Incident Handling"}
      subtitle="How RedRooEnergy responds when something goes wrong."
      sections={sections}
    />
  );
}
