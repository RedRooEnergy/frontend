export type AgentType = "freight" | "compliance" | "installer" | "supplier";

export interface AgentContact {
  email: string;
  phone: string;
  website: string;
}

export interface ServiceAgent {
  name: string;
  slug: string;
  agentType: AgentType;
  description: string;
  regionsServed: string[];
  certifications: string[];
  contact: AgentContact;
  logo: string;
  approvedCategories?: string[];
  approvedProducts?: string[];
}

const agents: ServiceAgent[] = [
  {
    name: "TransPac Freight Solutions",
    slug: "transpac-freight-solutions",
    agentType: "freight",
    description: "Specialist in DDP and project logistics for renewable energy shipments across Australia.",
    regionsServed: ["AU-wide", "NZ (by arrangement)", "Pacific Islands (project-based)"] ,
    certifications: ["IATA", "DAFF Biosecurity"],
    contact: { email: "ops@transpac.example", phone: "+61 2 8000 1001", website: "https://transpac.example" },
    logo: "/placeholders/agent.png",
  },
  {
    name: "Coastal Freight & Customs",
    slug: "coastal-freight-customs",
    agentType: "freight",
    description: "DDP customs clearance and last-mile delivery for metro and regional sites.",
    regionsServed: ["QLD", "NSW", "VIC"],
    certifications: ["DAFF Accredited", "AEO"],
    contact: { email: "hello@coastalfreight.example", phone: "+61 7 3100 2200", website: "https://coastalfreight.example" },
    logo: "/placeholders/agent.png",
  },
  {
    name: "GridSafe Compliance Partners",
    slug: "gridsafe-compliance-partners",
    agentType: "compliance",
    description: "Compliance evidence review and documentation alignment for PV and storage deployments.",
    regionsServed: ["AU-wide"],
    certifications: ["CEC Accredited Auditors", "ISO 9001"],
    contact: { email: "contact@gridsafe.example", phone: "+61 3 9000 1111", website: "https://gridsafe.example" },
    logo: "/placeholders/agent.png",
  },
  {
    name: "Regulus Standards Advisory",
    slug: "regulus-standards-advisory",
    agentType: "compliance",
    description: "Standards mapping and documentation support for large-scale solar and storage.",
    regionsServed: ["VIC", "SA", "NSW"],
    certifications: ["RPEQ Partner", "ISO 27001"],
    contact: { email: "info@regulus.example", phone: "+61 2 8100 4455", website: "https://regulus.example" },
    logo: "/placeholders/agent.png",
  },
  {
    name: "BrightLine Electrical",
    slug: "brightline-electrical",
    agentType: "installer",
    description: "CEC-accredited installers for residential and C&I PV with storage integration.",
    regionsServed: ["NSW", "ACT"],
    certifications: ["CEC A-Grade", "AS/NZS 5033"],
    contact: { email: "projects@brightline.example", phone: "+61 2 7200 8899", website: "https://brightline.example" },
    logo: "/placeholders/agent.png",
  },
  {
    name: "Sunrail Energy Services",
    slug: "sunrail-energy-services",
    agentType: "installer",
    description: "Utility and commercial installers with HV battery commissioning capability.",
    regionsServed: ["QLD", "NT"],
    certifications: ["CEC Utility", "HV Switching"],
    contact: { email: "ops@sunrail.example", phone: "+61 7 7500 3322", website: "https://sunrail.example" },
    logo: "/placeholders/agent.png",
  },
  {
    name: "Atlas Approved Supply",
    slug: "atlas-approved-supply",
    agentType: "supplier",
    description: "Approved supplier for modules, inverters, and storage lines with compliance evidence.",
    regionsServed: ["AU-wide"],
    certifications: ["ISO 9001", "CEC Approved Products"] ,
    contact: { email: "sales@atlas-supply.example", phone: "+61 3 8500 2200", website: "https://atlas-supply.example" },
    logo: "/placeholders/agent.png",
    approvedCategories: ["solar-pv-modules", "inverters-power-electronics", "energy-storage-batteries"],
    approvedProducts: ["monocrystalline-prod-1", "string-inverters-prod-1", "wall-mounted-lifepo4-prod-1"],
  },
  {
    name: "HarborTech Components",
    slug: "harbortech-components",
    agentType: "supplier",
    description: "Supplier for BOS, switchgear, and monitoring hardware with documented specs.",
    regionsServed: ["NSW", "VIC", "SA"],
    certifications: ["ISO 14001", "RCM Tested"],
    contact: { email: "contact@harbortech.example", phone: "+61 2 6900 1188", website: "https://harbortech.example" },
    logo: "/placeholders/agent.png",
    approvedCategories: ["electrical-bos", "switchgear-protection", "monitoring-control-iot"],
    approvedProducts: ["dc-isolators-prod-1", "surge-protection-prod-1", "smart-meters-prod-1"],
  },
];

export function getAgentsByType(agentType: AgentType): ServiceAgent[] {
  return agents.filter((a) => a.agentType === agentType);
}

export function getAgent(agentType: AgentType, slug: string): ServiceAgent | undefined {
  return agents.find((a) => a.agentType === agentType && a.slug === slug);
}

export function getAllAgentParams(agentType: AgentType) {
  return getAgentsByType(agentType).map((a) => ({ agentSlug: a.slug }));
}

export { agents };
