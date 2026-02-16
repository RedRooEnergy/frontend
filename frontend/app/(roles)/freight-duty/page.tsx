import type { Metadata } from "next";
import RoleInfoPageLayout from "../../../components/RoleInfoPageLayout";

export const metadata: Metadata = {
  title: "Freight & Duty (DDP) | RedRooEnergy",
  description: "Overview of DDP, customs, GST, duties, and delivery responsibilities for RedRooEnergy shipments in Australia.",
  alternates: { canonical: "/freight-duty" },
};

export default function FreightDutyPage() {
  return (
    <RoleInfoPageLayout
      title="Freight & Duty (Delivered Duty Paid – DDP)"
      subtitle="Delivered Duty Paid (DDP) shipments represent the highest level of logistical and regulatory responsibility within international trade. Under DDP terms, the seller assumes responsibility for the full delivery of goods to the named destination, including export clearance, international freight, import customs clearance, duties, taxes, and final delivery. Because DDP concentrates legal, financial, and compliance obligations across multiple parties and jurisdictions, it requires disciplined coordination, accurate documentation, and clearly defined accountability. RedRooEnergy has been designed as an executive-grade marketplace to support DDP transactions in a controlled, transparent, and auditable manner. The platform does not treat freight or customs as ancillary services; they are integral to transaction integrity, risk management, and regulatory compliance. This section explains how Delivered Duty Paid shipments are structured, governed, and executed within the RedRooEnergy ecosystem."
      audience={[
        "Buyers - Commercial buyers, project developers, asset owners, and procurement teams coordinating domestic or international renewable energy projects where logistics, customs clearance, and delivery timing are critical to project outcomes.",
        "Suppliers - Manufacturers and exporters shipping regulated electrical and energy products into Australia under DDP terms, who retain responsibility for compliance, customs clearance, and duty settlement.",
        "Logistics and Service Partners - Freight forwarders, customs brokers, carriers, and logistics service providers managing DDP consignments on behalf of suppliers or buyers, operating within defined contractual and compliance boundaries.",
      ]}
      steps={[
        "Incoterms and Consignee Confirmation - Prior to shipment, the applicable Incoterms® (DDP) and consignee details must be formally confirmed. This includes the legal importing entity, delivery address, and any project-specific requirements that may affect customs treatment or delivery sequencing. Ambiguity at this stage introduces material risk and is not permitted within the platform workflow.",
        "Documentation and Compliance Preparation - Suppliers are required to prepare and submit complete customs and compliance documentation in advance of shipment. This typically includes commercial invoices, packing lists, transport documents, product compliance certificates, tariff classifications, and any required regulatory approvals. Documentation accuracy is critical; discrepancies may result in customs delays, penalties, or shipment holds.",
        "Freight Arrangement and Risk Escalation Paths - International and domestic transport must be arranged with defined escalation pathways for damage, loss, delay, or regulatory intervention. RedRooEnergy requires that escalation responsibilities are agreed in advance, ensuring that incidents are managed promptly and without dispute over authority or liability.",
        "Delivery, Handover, and Proof of Completion - Upon delivery, proof of delivery and all supporting documentation must be recorded to confirm completion of the DDP obligation. This step forms part of the transaction audit trail and may be required for payment settlement, warranty activation, insurance validation, or regulatory review.",
      ]}
      benefits={[
        "Aligned Expectations - All participants operate under a shared, explicit understanding of Delivered Duty Paid obligations, reducing the risk of assumption-based disputes or post-shipment disagreements.",
        "Documentation Clarity - Required documents for customs, compliance, and delivery are defined upfront, enabling smoother border clearance and predictable delivery timelines.",
        "Structured Escalation - Damage, loss, or delay scenarios are governed by predefined escalation mechanisms, ensuring accountability and rapid resolution rather than reactive dispute management.",
      ]}
      responsibilities={[
        "Import and Tax Obligations - Parties must verify that import duties, GST, and any other applicable charges are correctly assessed and paid in accordance with Australian law. Incorrect declarations or underpayments expose all parties to regulatory and financial risk.",
        "Packaging and Labelling Compliance - Goods must be packaged, labelled, and documented in accordance with transport, safety, and regulatory requirements. Non-compliant packaging can result in shipment rejection, delays, or damage.",
        "Exception Reporting - Any deviations, incidents, or non-conformances must be reported promptly and supported with appropriate evidence. Delayed or incomplete reporting undermines resolution processes and audit defensibility.",
      ]}
      complianceNote="Delivered Duty Paid transactions depend fundamentally on the accuracy and integrity of declared information. Customs authorities, insurers, financiers, and regulators rely on the truthfulness of documentation and declarations. Within RedRooEnergy, DDP responsibilities are governed by agreed contractual terms and supported by platform-level controls; however, accountability remains shared between the shipper and the receiver in accordance with those terms. Failure to meet documentation, compliance, or reporting standards may result in shipment delays, financial exposure, or regulatory action. RedRooEnergy’s governance model is designed to reduce these risks by enforcing discipline, transparency, and verifiable records at every stage of the DDP lifecycle."
      ctaLabel="Learn About Freight & Duty"
      ctaHref="/contact"
    />
  );
}
