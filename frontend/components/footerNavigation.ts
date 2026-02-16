export type FooterLink = { label: string; href?: string; binding?: boolean };
export type FooterSection = { header: string; links: FooterLink[] };

const link = (label: string, href?: string, binding?: boolean): FooterLink => ({
  label,
  href,
  binding,
});

export const footerNavigation: FooterSection[] = [
  {
    header: "Platform",
    links: [
      link("About RedRooEnergy", "/about-redrooenergy"),
      link("How the Marketplace Works", "/how-the-marketplace-works"),
      link("Platform Governance Overview", "/marketplace-governance-trust/marketplace-governance"),
      link("Compliance-First Marketplace Model", "/compliance-standards"),
      link("Security & Data Protection Overview", "/platform-use-accounts-security/data-protection-security"),
      link("API & Integrations Overview", "/api-integrations"),
    ],
  },
  {
    header: "Buy on RedRooEnergy",
    links: [
      link("Buyer Overview", "/buyers"),
      link("Purchasing Cooperatives", "/purchasing-cooperatives"),
      link("Aggregated Buying", "/group-aggregated-buying"),
      link("Commercial & Enterprise Buyers", "/commercial-industrial"),
      link("Public Sector & Government Buyers", "/public-sector-government"),
      link("Large / Project-Based Procurement", "/infrastructure-utility-scale"),
      link("Buyer Onboarding Process", "/buyer-onboarding-process"),
      link("Commercial Terms (Buyer)", "/buyer-terms", true),
      link("Payment & Settlement Overview", "/payment-escrow-overview"),
    ],
  },
  {
    header: "Sell on RedRooEnergy",
    links: [
      link("Supplier Overview", "/suppliers"),
      link("Approved Supplier Program", "/supplier-onboarding"),
      link("Supplier Onboarding Process", "/supplier-onboarding"),
      link("Product Approval & Compliance", "/product-approval-rejection", true),
      link("Commercial Terms (Supplier)", "/supplier-terms", true),
      link("Logistics & Shipping Requirements", "/shipping-delivery-policy", true),
      link("DDP (Delivered Duty Paid) Model", "/shipping-ddp-model", true),
      link("Payment & Settlement (Supplier)", "/supplier-commissions", true),
    ],
  },
  {
    header: "Service Partners",
    links: [
      link("Service Partner Overview", "/service-partners"),
      link("Freight & Shipping Agents", "/service-agents/freight-shipping"),
      link("Compliance & Certification Agents", "/service-agents/compliance"),
      link("Licensed Installers & Electricians", "/service-agents/installers"),
      link("Warranty & After-Sales Partners", "/warranty-service-providers"),
      link("Approved Service Partner Directory", "/service-partners"),
      link("Becoming a Service Partner", "/service-partners"),
    ],
  },
  {
    header: "Compliance & Governance",
    links: [
      link("Compliance Overview", "/compliance-standards"),
      link("Australian Regulatory Framework", "/regulatory-alignment"),
      link("CEC Accreditation", "/compliance-certification-standards/cec-compliance"),
      link("RCM / EESS Compliance", "/compliance-certification-standards/rcm-eess-compliance", true),
      link("GEMS Registration", "/compliance-certification-standards/gems-registration", true),
      link("Product Certification Requirements", "/compliance-certification-standards/compliance-certification-overview", true),
      link("Audit & Verification Process", "/audit-evidence", true),
      link("Governance Framework Overview", "/governance-framework"),
      link("Marketplace Rules & Operating Principles", "/marketplace-governance-trust/marketplace-governance", true),
      link("Risk Management Framework", "/risk-incident-handling"),
      link("Dispute Resolution Process", "/commerce-orders-payments/dispute-resolution", true),
      link("Escalation & Complaints Handling", "/help-support-information/complaints-handling", true),
    ],
  },
  {
    header: "Legal & Policies",
    links: [
      link("Terms & Conditions", "/core-legal-consumer/terms-of-service", true),
      link("Privacy Policy", "/core-legal-consumer/privacy-policy", true),
      link("Data Retention & Usage Policy", "/core-legal-consumer/data-retention-summary", true),
      link("Acceptable Use Policy", "/core-legal-consumer/acceptable-use-policy", true),
      link("Sanctions & Export Controls", undefined, true),
      link("Modern Slavery Statement", "/core-legal-consumer/modern-slavery-statement", true),
      link("Regulatory Disclosures", "/regulatory-alignment", true),
      link("Policies & Notices Index", "/policies-disclosures"),
    ],
  },
  {
    header: "Support & Resources",
    links: [
      link("Help Centre", "/help-support-information/help-centre"),
      link("FAQs", "/help-support-information/faqs"),
      link("Documentation Library", "/guides-documentation"),
      link("Platform Guides", "/platform-guides"),
      link("Onboarding Guides", "/onboarding-guides"),
      link("Contact Support", "/help-support-information/contact"),
      link("Incident & Issue Reporting", "/risk-incident-handling", true),
    ],
  },
  {
    header: "Corporate",
    links: [
      link("Corporate Information", "/corporate-structure"),
      link("Media & Press", "/media-press-kit"),
      link("Careers", "/careers"),
      link("Contact RedRooEnergy", "/contact"),
      link("Investor & Stakeholder Information", "/investor-partner-enquiries"),
    ],
  },
];

export const ENABLE_GLOBAL_FOOTER = false;

export const globalRegionalOperations = [
  {
    region: "Oceania",
    countries: ["Australia", "New Zealand", "Pacific Islands"],
    links: [
      "Regional Overview",
      "Local Compliance",
      "Shipping & Taxes",
      "Regional Partners",
      "Currency & Payments",
      "Legal Notices",
      "Regional Support",
    ],
  },
  { region: "Asia-Pacific", links: [] },
  { region: "Americas", links: [] },
  { region: "Europe", links: [] },
  { region: "Middle East & Africa", links: [] },
];
