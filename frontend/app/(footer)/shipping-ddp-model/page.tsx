import FooterPageLayout from "../../../components/FooterPageLayout";

export default function Page() {
  const sections = [
    {
      heading: "Overview",
      paragraphs: [
        "RedRooEnergy uses a Delivered Duty Paid (DDP) shipping model to make cross-border and domestic delivery clearer for buyers. The aim is to reduce uncertainty by defining responsibilities upfront rather than after goods are in transit.",
      ],
    },
    {
      heading: "What you should know",
      paragraphs: [
        "Under a DDP model, shipping, duties, and import-related costs are addressed as part of the order process. This helps buyers understand the full delivered cost and avoids unexpected charges on arrival. DDP does not mean informal handling; it means responsibilities are defined and documented.",
      ],
    },
    {
      heading: "Scope and intent",
      paragraphs: [
        "This page explains the DDP shipping approach in plain language. It is not a freight contract or customs advisory. Its purpose is to help users understand how delivery responsibilities are handled within the marketplace.",
      ],
    },
    {
      heading: "Who this is for",
      paragraphs: [],
      bullets: [
        "Buyers ordering products that may involve international or complex logistics.",
        "Suppliers arranging shipment to Australia under defined delivery terms.",
        "Logistics and service partners supporting freight, customs, and final delivery.",
      ],
    },
    {
      heading: "How DDP shipping works on RedRooEnergy",
      paragraphs: [
        "Orders placed through the marketplace include defined delivery terms. Shipping arrangements, import duties, and applicable taxes are accounted for as part of the order structure. Progress is tracked through the platform so buyers can see where their order is and what stage it is at.",
      ],
    },
    {
      heading: "Operational guardrails",
      paragraphs: [
        "All shipping under the DDP model follows the marketplace's structured processes. Documentation, delivery confirmation, and any exceptions are handled through the platform. Off-platform arrangements or undocumented changes are not supported.",
      ],
    },
    {
      heading: "How this applies on RedRooEnergy",
      paragraphs: [
        "In practice, the DDP model helps buyers receive goods with fewer surprises. By clarifying delivery responsibilities and recording each step, RedRooEnergy supports predictable delivery outcomes and clearer coordination between buyers, suppliers, and logistics partners.",
      ],
    },
  ];

  return (
    <FooterPageLayout
      title={"Shipping & DDP Model"}
      subtitle="How delivery and import responsibilities work on RedRooEnergy."
      sections={sections}
    />
  );
}
