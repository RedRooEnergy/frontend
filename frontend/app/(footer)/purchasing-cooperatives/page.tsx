import FooterPageLayout from "../../../components/FooterPageLayout";

export default function Page() {
  const sections = [
    {
      heading: "Overview",
      paragraphs: [
        "RedRooEnergy supports purchasing cooperatives as a way for groups to buy renewable energy products together under a single, structured approach. Cooperatives help participants benefit from scale while keeping ordering and documentation organised.",
      ],
    },
    {
      heading: "What you should know",
      paragraphs: [
        "A purchasing cooperative brings multiple buyers together to place coordinated orders. This can improve pricing clarity, simplify logistics, and align product selection across projects. RedRooEnergy supports this by keeping products approved and processes consistent for all participants.",
      ],
    },
    {
      heading: "Scope and intent",
      paragraphs: [
        "This page explains, in plain language, how purchasing cooperatives work on RedRooEnergy. It is not a legal or financial agreement. Its purpose is to outline the concept and how the marketplace supports it.",
      ],
    },
    {
      heading: "Who this is for",
      paragraphs: [],
      bullets: [
        "Community groups or organisations coordinating shared purchases.",
        "Commercial buyers managing multiple sites or projects.",
        "Industry groups seeking consistent product selection and documentation.",
        "Public or semi-public entities exploring coordinated procurement.",
      ],
    },
    {
      heading: "How cooperatives work on RedRooEnergy",
      paragraphs: [
        "Cooperative purchases are organised within the marketplace so products, pricing, and documentation remain clear. Orders are placed through structured workflows, and records are maintained to support transparency and accountability for all members.",
      ],
    },
    {
      heading: "Operational guardrails",
      paragraphs: [
        "All cooperative purchases follow the same marketplace rules as individual orders. Products must be approved before listing, roles are clearly defined, and transactions are recorded through the platform. Informal or off-platform arrangements are not supported.",
      ],
    },
    {
      heading: "How this applies on RedRooEnergy",
      paragraphs: [
        "In practice, purchasing cooperatives allow groups to buy with confidence and consistency. Members benefit from shared coordination while relying on RedRooEnergy to manage approvals, records, and order tracking in a controlled and dependable way.",
      ],
    },
  ];

  return (
    <FooterPageLayout
      title={"Purchasing Cooperatives"}
      subtitle="Buying together through RedRooEnergy."
      sections={sections}
    />
  );
}
