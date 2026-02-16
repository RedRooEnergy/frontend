import type { Metadata } from "next";
import RoleInfoPageLayout from "../../../components/RoleInfoPageLayout";

export const metadata: Metadata = {
  title: "Buyers on RedRooEnergy | RedRooEnergy",
  description: "Overview for buyers using RedRooEnergy: purchasing, compliance assurance, DDP delivery, and dispute handling guidance.",
  alternates: { canonical: "/buyers" },
};

export default function BuyersPage() {
  return (
    <RoleInfoPageLayout
      title="Buyers on RedRooEnergy"
      subtitle="RedRooEnergy has been established as a governed procurement marketplace for energy and electrical equipment operating within regulated, project-critical environments. Buyers on the platform are not presented with informal listings or unverified product claims; instead, procurement activity is structured around documented specifications, traceable compliance evidence, and clearly defined delivery and handover expectations. The marketplace is designed to support commercial, infrastructure, and project-based purchasing where accountability, auditability, and lifecycle documentation are essential. Buyers retain decision authority while operating within a framework that promotes transparency, risk reduction, and disciplined execution across procurement, logistics, and post-delivery support."
      audience={[
        "Procurement and Supply Chain Teams - Teams responsible for sourcing energy equipment for projects across Australia, requiring visibility into product specifications, compliance positioning, and delivery obligations before commitment.",
        "Project Developers and EPC Contractors - Developers, engineers, and EPC organisations seeking compliant, documented supply aligned with Australian standards, contractual delivery terms, and project schedules.",
        "Facilities and Asset Managers - Operators and asset owners requiring structured documentation to support commissioning, maintenance, warranty claims, and long-term asset management.",
      ]}
      steps={[
        "Platform Access and Market Review - Buyers access the marketplace to review available product categories, supplier profiles, and associated documentation. Listings are presented with structured information rather than marketing summaries, enabling early assessment of suitability and risk.",
        "Listing Review and Due Diligence - Buyers may request and review product listings, technical specifications, and compliance notes. Where documentation is provided, it is surfaced explicitly to support procurement evaluation. Buyers remain responsible for determining fitness for purpose within their specific project context.",
        "Shipping and Delivery Coordination - Logistics expectations, including Delivered Duty Paid (DDP) arrangements where applicable, are coordinated with clarity around roles, documentation, and evidence requirements. Delivery terms are not implicit and must be understood prior to order placement.",
        "Documentation Tracking and Handover - Delivery, compliance, and supporting documentation are tracked to support handover, commissioning, warranty activation, and future reference. This documentation forms part of the transaction record and may be relied upon for operational and regulatory purposes.",
      ]}
      benefits={[
        "Upfront Structure and Transparency - Listings are presented with structured documentation and defined information fields, reducing ambiguity and supporting internal approval processes.",
        "Logistics Alignment - DDP-aligned delivery notes and expectations support coordinated project logistics, reducing the risk of delivery disputes or last-minute responsibility gaps.",
        "Pre-Defined Dispute Pathways - Dispute handling and escalation pathways are outlined before purchase, providing clarity on resolution mechanisms should issues arise.",
      ]}
      responsibilities={[
        "Project Suitability Confirmation - Buyers must confirm that selected products meet the technical, regulatory, and operational requirements of each specific project site, including local standards and network conditions.",
        "Accurate Delivery Information - Correct delivery addresses, site contacts, and access requirements must be provided to ensure successful delivery and minimise logistical disruption.",
        "Document Retention - All provided documentation should be retained for commissioning, warranty administration, insurance, and lifecycle asset management. Loss of documentation enables risk and may compromise downstream claims.",
      ]}
      complianceNote="RedRooEnergy supports compliance transparency by surfacing available evidence and documentation; however, responsibility for final compliance verification remains with the buyer. Regulatory requirements, grid codes, and project-specific obligations vary by jurisdiction and application. Buyers are expected to independently confirm that supplied equipment aligns with applicable Australian standards, local network requirements, and contractual obligations. The marketplace framework is designed to support informed procurement decisions, not to replace professional or regulatory due diligence."
      ctaLabel="Create a Buyer Account"
      ctaHref="/signin?role=buyer"
    />
  );
}
