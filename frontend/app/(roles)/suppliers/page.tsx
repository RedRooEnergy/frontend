import type { Metadata } from "next";
import RoleInfoPageLayout from "../../../components/RoleInfoPageLayout";

export const metadata: Metadata = {
  title: "Suppliers on RedRooEnergy | RedRooEnergy",
  description: "Guidance for suppliers listing products on RedRooEnergy: compliance, fulfilment expectations, and escrow overview.",
  alternates: { canonical: "/suppliers" },
};

export default function SuppliersPage() {
  return (
    <RoleInfoPageLayout
      title="Suppliers on RedRooEnergy"
      subtitle="RedRooEnergy operates as a governed commercial marketplace for energy and electrical equipment supplied into regulated Australian markets. Supplier participation is structured, evidence-driven, and designed to support accountable trade rather than informal product listing. The platform exists to enable qualified suppliers to present products with clarity, support buyers with verifiable documentation, and fulfil orders under clearly defined commercial and logistical expectations. Suppliers on RedRooEnergy are not passive vendors. They are accountable participants within a controlled procurement ecosystem where compliance, logistics discipline, and post-delivery support form part of the commercial obligation. Listings, fulfilment, and after-sales engagement are expected to meet professional standards consistent with project delivery, regulatory scrutiny, and long-term asset use."
      audience={[
        "Manufacturers and Authorised Distributors - Original equipment manufacturers and formally authorised distributors supplying energy equipment intended for use in Australian residential, commercial, and infrastructure projects.",
        "Importers with Regulatory Documentation - Suppliers acting as importers of record or coordinating importation with compliant documentation, customs declarations, and duty arrangements.",
        "Suppliers Supporting Australian Standards - Organisations supplying equipment aligned with Australian electrical standards, grid requirements, and project-specific compliance expectations.",
      ]}
      steps={[
        "Platform Access and Listing Publication - Suppliers sign in to publish product listings using structured specification fields rather than free-form descriptions. Where available, compliance evidence and supporting documentation are attached to listings to enable informed buyer assessment.",
        "Shipping Terms and Logistics Alignment - Suppliers must clearly state shipping terms, including alignment with Delivered Duty Paid (DDP) arrangements where applicable. Logistics responsibilities are not implied and must be explicitly defined prior to order acceptance.",
        "Order Fulfilment and Documentation - Orders are fulfilled with traceable documentation, including packing lists, transport records, and delivery evidence. These records form part of the transaction history and may be relied upon for settlement, dispute resolution, or audit review.",
        "Warranty and After-Sales Support - Suppliers are expected to support warranty and after-sales requirements by providing clear warranty terms, contact points, and supporting documentation. This ensures continuity beyond delivery and supports buyer asset management obligations.",
      ]}
      benefits={[
        "Structured Product Presentation - Listings are supported by defined specification and evidence fields, improving buyer confidence and reducing clarification cycles during procurement.",
        "Clear Logistics Expectations - Buyer expectations regarding delivery, documentation, and Incoterms are established upfront, reducing fulfilment disputes and execution risk.",
        "Predictable Dispute and Return Framework - Dispute resolution and returns are governed by a defined framework, reducing uncertainty and avoiding ad hoc commercial negotiations after delivery.",
      ]}
      responsibilities={[
        "Accuracy of Specifications and Certifications - Suppliers must ensure that all published specifications, certifications, and compliance claims are accurate, current, and reflective of the supplied product configuration.",
        "Fulfilment Discipline and Exception Management - Shipments must be executed in accordance with agreed Incoterms and delivery terms. Any delays, deviations, or incidents must be communicated promptly with supporting evidence.",
        "Warranty and Support Information - Suppliers are responsible for providing clear warranty terms, service contacts, and support documentation to enable effective post-delivery engagement.",
      ]}
      complianceNote="Supplier trust on RedRooEnergy is grounded in documentation accuracy and currency. Listings are expected to reflect current certifications, approvals, and applicable standards at the time of publication. Suppliers remain responsible for monitoring expiry dates, renewals, and regulatory changes affecting their products. Inaccurate, expired, or misleading compliance representations undermine marketplace integrity and may result in listing suspension, dispute exposure, or removal from the platform. RedRooEnergy’s governance framework is designed to support disciplined suppliers and to protect buyers, projects, and regulatory standing across the supply chain."
      ctaLabel="Create a Supplier Account"
      ctaHref="/signin?role=supplier"
    />
  );
}
