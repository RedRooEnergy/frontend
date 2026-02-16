import type { Metadata } from "next";
import DocumentPageLayout from "../../../../components/DocumentPageLayout";

const titleText = "Product Catalogue Overview";
const description =
  "Governance-first overview of how the RedRooEnergy marketplace catalogue is generated, locked, and used across buyers, suppliers, administrators, and regulators.";

export const metadata: Metadata = {
  title: `${titleText} | RedRooEnergy`,
  description,
  alternates: {
    canonical: "/product-catalogue-overview",
  },
};

const meta = { lastUpdated: "2026-02-07", version: "v1.0" };

export default function Page() {
  const sections = [
    {
      heading: "Purpose & Scope",
      paragraphs: [
        "The RedRooEnergy (RRE) Product Catalogue is the authoritative commercial record of what can be sold, at what price, and under what compliance and delivery terms during a defined catalogue period.",
        "It is a governed, versioned, and audit-ready artefact. It is not a static brochure and it is not a free-form listing board.",
      ],
    },
    {
      heading: "What the Catalogue Is",
      paragraphs: [
        "The catalogue is a weekly-generated, immutable snapshot of approved products, placements, and pricing for a specific ISO week (YYYY-WW).",
        "Each catalogue instance is hash-sealed and remains read-only once locked and published. The hash is referenced across pricing snapshots, payments, invoices, disputes, and regulator exports.",
      ],
      bullets: [
        "Weekly cycle with deterministic ordering",
        "Locked and immutable once published",
        "Hash-sealed for audit integrity",
      ],
    },
    {
      heading: "How the Catalogue Is Used",
      paragraphs: [
        "Buyers use the catalogue to discover approved products, confirm delivery terms (DDP), and understand pricing validity for a specific period.",
        "Suppliers use it to gain governed exposure through tiers and approved placements. Admins use it to enforce pricing, compliance, and placement rules. Regulators use it as evidence of what was available at the time of purchase.",
      ],
      bullets: [
        "Buyer discovery and procurement reference",
        "Supplier visibility and monetised placement",
        "Admin governance enforcement layer",
        "Regulator-grade evidence record",
      ],
    },
    {
      heading: "Catalogue Update Cycle",
      paragraphs: [
        "The catalogue operates on a weekly lock cycle. Inputs close, governance checks run, a manifest is generated, and the catalogue is locked and published.",
        "Once locked, no mid-week edits are permitted. Emergency removals are handled via withdrawal flags while preserving the original locked record.",
      ],
      bullets: [
        "Submissions and bids close",
        "Governance validation and pricing integrity checks",
        "Manifest generation and hash sealing",
        "Publication for the catalogue period",
      ],
    },
    {
      heading: "How Suppliers Get Listed",
      paragraphs: [
        "Suppliers cannot edit the live catalogue. Products must first be approved through the governed product intake process, including certifications, partner review, and admin approval.",
        "Approved products are eligible for catalogue placement but are only surfaced according to placement rules and paid programs.",
      ],
      bullets: [
        "Supplier onboarding and approval required",
        "Product compliance and evidence required",
        "Catalogue placement is rule-driven and monetised",
      ],
    },
    {
      heading: "Placement & Layout Rules",
      paragraphs: [
        "Catalogue ordering is deterministic and enforced every cycle. There is no dynamic reordering and no algorithmic bypass of placement rules.",
        "Homepage and category sections are controlled catalogue zones, not ad-hoc widgets.",
      ],
      bullets: [
        "Platinum tier → Gold tier → Weekly Best Deals",
        "Silver tier → Bronze tier → Featured listings",
        "Standard approved listings last",
      ],
    },
    {
      heading: "Supplier Charges & Monetisation",
      paragraphs: [
        "RRE does not charge supplier commissions on sales. Catalogue monetisation occurs through governed placements and promotional programs, not deductions from orders.",
        "All catalogue fees are invoiced separately and are never netted against buyer payments.",
      ],
      bullets: [
        "Paid featured placements",
        "Approved promotions and hot deals",
        "Tiered supplier programs",
        "Catalogue download access tiers (where applicable)",
      ],
    },
    {
      heading: "Catalogue Downloads & Exports",
      paragraphs: [
        "Catalogue downloads are role-scoped and hash-referenced. Buyers receive filtered outputs, commercial buyers receive detailed exports, and regulators receive full evidence packs.",
        "Each download embeds the catalogue week ID, generation timestamp, and hash reference to ensure reproducibility.",
      ],
      bullets: [
        "Buyer PDF or structured export",
        "Commercial line-item exports",
        "Regulator evidence packs with hashes",
      ],
    },
    {
      heading: "Pricing, Payments & Audit Integration",
      paragraphs: [
        "Every checkout creates a Pricing Snapshot that references the catalogue week ID and hash. Orders cannot be created if the snapshot does not match the locked catalogue.",
        "Invoices, refunds, and disputes reference the same catalogue snapshot to maintain commercial and audit integrity.",
      ],
      bullets: [
        "Pricing snapshot enforcement",
        "Hash verification at checkout and webhooks",
        "Audit trail consistency across payments",
      ],
    },
    {
      heading: "Design & UX Philosophy",
      paragraphs: [
        "The catalogue is designed for clarity and trust. It prioritises compliance visibility, delivery model clarity (DDP), and pricing validity over marketing gimmicks.",
        "Catalogue views are read-only projections of a locked manifest. The intelligence lives in governance and generation logic, not in the front-end.",
      ],
    },
    {
      heading: "How This Applies on RedRooEnergy",
      paragraphs: [
        "In practice, the catalogue is the commercial ledger of the marketplace. It ensures fair visibility, prevents price drift, and provides a regulator-ready record of what was offered during each catalogue period.",
      ],
    },
  ];

  return (
    <DocumentPageLayout
      title={titleText}
      subtitle="Governed, weekly-locked marketplace catalogue for approved products."
      meta={meta}
      sections={sections}
    />
  );
}
