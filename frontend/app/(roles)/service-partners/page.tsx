import type { Metadata } from "next";
import RoleInfoPageLayout from "../../../components/RoleInfoPageLayout";

export const metadata: Metadata = {
  title: "Service Partners on RedRooEnergy | RedRooEnergy",
  description: "Information for service partners on vetting, installation, compliance roles, and work allocation across projects.",
  alternates: { canonical: "/service-partners" },
};

export default function ServicePartnersPage() {
  return (
    <RoleInfoPageLayout
      title="Service Partners on RedRooEnergy"
      subtitle="RedRooEnergy integrates installation, compliance, and logistics service partners as governed participants within the marketplace ecosystem. Service partners are not treated as informal subcontractors or ad hoc support providers; they operate under defined roles, documented scopes, and enforceable standards aligned with Australian regulatory and project requirements. The platform is designed to support professional service delivery where traceability, evidence capture, and compliance verification are essential. Service partners contribute directly to project outcomes, commissioning integrity, and long-term asset performance, and are therefore subject to clear expectations and accountability throughout the engagement lifecycle. RRE does not process payments for service partners—service payments occur off-platform, while a 1% connection fee is recorded at marketplace level."
      audience={[
        "CEC-Accredited Installers and Electrical Contractors - Licensed installers and contractors performing installation, commissioning, and electrical works in accordance with Australian standards and Clean Energy Council requirements.",
        "Compliance Auditors and Inspectors - Independent or engaged professionals responsible for inspection, certification, and verification of compliance against regulatory, safety, and project-specific criteria.",
        "Freight and Field Service Coordinators - Logistics and field services personnel coordinating site access, delivery sequencing, installation readiness, and on-site support activities.",
      ]}
      steps={[
        "Role Confirmation and Accreditation Validation - Service partners sign in to confirm their role profile, licences, accreditations, and scope of services. Only verified and current credentials are accepted for engagement.",
        "Work Allocation and Scope Definition - Work is allocated with documented scope, applicable standards, and evidence requirements defined in advance. Service partners are not expected to interpret ambiguous instructions or informal requirements.",
        "Execution and Evidence Capture - Works are performed in accordance with the approved scope, site conditions, and safety requirements. Evidence is captured during execution to support commissioning, certification, and project records.",
        "Task Close-Out and Documentation Submission - Upon completion, service partners close out tasks by uploading required documentation, certificates, and reports to the project record. This documentation forms part of the permanent audit and asset trail.",
      ]}
      benefits={[
        "Defined Scopes and Standards - Clear scopes of work and expected standards are provided upfront, reducing rework and dispute risk.",
        "Logistics and Site Readiness Alignment - Logistics notes and delivery coordination support effective site access and sequencing, improving efficiency and safety.",
        "Governance Transparency - Governance expectations, evidence requirements, and accountability are visible before work commences, enabling informed acceptance of engagements.",
      ]}
      responsibilities={[
        "Licensing and Accreditation Maintenance - Service partners must maintain current licences, accreditations, and registrations relevant to their role. Lapsed or invalid credentials may result in suspension from engagements.",
        "Compliance with Site and Safety Requirements - All works must comply with site-specific safety instructions, regulatory requirements, and applicable Australian standards.",
        "Evidence and Incident Reporting - Completion evidence, inspection reports, and any incidents or deviations must be documented and reported promptly with appropriate supporting material.",
      ]}
      complianceNote="All service partner activities must align with Australian standards, regulatory obligations, and project-specific conditions. Evidence of accreditation, work completion, and compliance is mandatory and forms part of the project’s permanent record. Failure to meet documentation, safety, or compliance requirements undermines project integrity and may result in remedial action, removal from active engagements, or exclusion from the marketplace. RedRooEnergy’s governance framework is designed to support disciplined service delivery and protect all participants across the project lifecycle."
      ctaLabel="Apply as a Service Partner"
      ctaHref="/signin?role=service-partner"
    />
  );
}
