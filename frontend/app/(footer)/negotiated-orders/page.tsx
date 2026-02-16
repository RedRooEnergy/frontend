import FooterPageLayout from "../../../components/FooterPageLayout";

export default function Page() {
  const sections = [
    {
      heading: "Overview",
      paragraphs: [
        "This page outlines the core considerations for stakeholders evaluating this topic within the RedRooEnergy governed marketplace.",
      ],
    },
    {
      heading: "What you should know",
      paragraphs: [
        "Key expectations, responsibilities, and boundaries are described here to provide clear, business-grade guidance.",
      ],
      bullets: [
        "Scope and intent",
        "Stakeholder roles",
        "Operational guardrails",
      ],
    },
    {
      heading: "How this applies on RedRooEnergy",
      paragraphs: [
        "This section explains how the governed marketplace approaches this area, keeping outcomes deterministic and audit-ready.",
      ],
    },
  ];

  return (
    <FooterPageLayout
      title={"Negotiated Orders"}
      subtitle="Informational guidance for RedRooEnergy participants."
      sections={sections}
    />
  );
}
