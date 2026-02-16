import type { CareerJob, CareerRegion, CareerSeniority, CareerTeam, CareerWorkType } from "../lib/careers/types";

export type SeedCareerJob = Omit<CareerJob, "id" | "slug" | "refCode" | "postedAt" | "updatedAt">;

const base = (partial: Partial<SeedCareerJob>): SeedCareerJob => ({
  title: "Untitled Role",
  team: "Operations",
  locations: ["Remote"],
  regionTag: "Global",
  workType: "Full-time",
  seniority: "Mid",
  summary: "Join RedRooEnergy to help build a compliant renewable energy marketplace.",
  sections: {
    aboutRole: "You will support the platform with clear, accountable delivery across stakeholders and regions.",
    responsibilities: [],
    requiredSkills: [],
    niceToHave: [],
  },
  compensationMin: undefined,
  compensationMax: undefined,
  currency: "AUD",
  status: "published",
  featured: false,
  ...partial,
});

const makeRole = (params: {
  title: string;
  team: CareerTeam;
  locations: string[];
  regionTag: CareerRegion;
  workType: CareerWorkType;
  seniority: CareerSeniority;
  summary: string;
  aboutRole: string;
  responsibilities: string[];
  requiredSkills: string[];
  niceToHave: string[];
  regionNotes?: string;
  assessment?: string;
  compensationMin?: number;
  compensationMax?: number;
  currency?: string;
}): SeedCareerJob =>
  base({
    title: params.title,
    team: params.team,
    locations: params.locations,
    regionTag: params.regionTag,
    workType: params.workType,
    seniority: params.seniority,
    summary: params.summary,
    sections: {
      aboutRole: params.aboutRole,
      responsibilities: params.responsibilities,
      requiredSkills: params.requiredSkills,
      niceToHave: params.niceToHave,
      regionNotes: params.regionNotes,
      assessment: params.assessment,
    },
    compensationMin: params.compensationMin,
    compensationMax: params.compensationMax,
    currency: params.currency || "AUD",
    featured: params.seniority === "Lead",
  });

export const seedJobs: SeedCareerJob[] = [
  makeRole({
    title: "Compliance Lead",
    team: "Compliance",
    locations: ["NSW, Australia", "VIC, Australia"],
    regionTag: "AU",
    workType: "Full-time",
    seniority: "Lead",
    summary: "Lead compliance assurance for products listed on the marketplace.",
    aboutRole:
      "You will shape the compliance framework that ensures listed products meet Australian standards and marketplace governance.",
    responsibilities: [
      "Define compliance review workflows and evidence requirements.",
      "Partner with suppliers to resolve approval gaps.",
      "Maintain audit-ready compliance documentation.",
      "Guide internal teams on regulatory alignment.",
    ],
    requiredSkills: ["Regulatory compliance experience", "Risk assessment", "Stakeholder communication"],
    niceToHave: ["Renewable energy product knowledge", "Policy drafting"],
    regionNotes: "Based in Australia with occasional travel to project locations.",
    assessment: "We review compliance case studies and decision-making examples.",
  }),
  makeRole({
    title: "Supplier Onboarding Specialist",
    team: "Operations",
    locations: ["China"],
    regionTag: "China",
    workType: "Full-time",
    seniority: "Mid",
    summary: "Support supplier onboarding and documentation reviews for China-based partners.",
    aboutRole:
      "You will guide suppliers through onboarding requirements and ensure documentation is complete and accurate.",
    responsibilities: [
      "Coordinate onboarding steps with suppliers.",
      "Validate compliance documentation and listings.",
      "Track onboarding progress and issue resolution.",
    ],
    requiredSkills: ["Supplier operations", "Documentation review", "Cross-border communication"],
    niceToHave: ["Mandarin language", "Supply chain background"],
    regionNotes: "Role supports China-based suppliers with cross-border coordination.",
  }),
  makeRole({
    title: "Logistics Coordinator",
    team: "Logistics",
    locations: ["NSW, Australia", "New Zealand"],
    regionTag: "NZ",
    workType: "Full-time",
    seniority: "Mid",
    summary: "Coordinate delivery schedules and logistics updates for AU/NZ orders.",
    aboutRole:
      "You will ensure delivery timelines and evidence requirements are met for regulated energy projects.",
    responsibilities: [
      "Coordinate shipment timelines with suppliers and service partners.",
      "Maintain delivery documentation and proof of handover.",
      "Escalate risks related to customs or delivery delays.",
    ],
    requiredSkills: ["Logistics coordination", "Detail accuracy", "Issue escalation"],
    niceToHave: ["DDP knowledge", "Freight forwarding exposure"],
  }),
  makeRole({
    title: "Marketplace Operations",
    team: "Operations",
    locations: ["NSW, Australia", "VIC, Australia"],
    regionTag: "AU",
    workType: "Full-time",
    seniority: "Senior",
    summary: "Oversee daily marketplace operations and order flow.",
    aboutRole:
      "You will keep marketplace workflows reliable and ensure buyers and suppliers follow structured processes.",
    responsibilities: [
      "Monitor order flow and status adherence.",
      "Coordinate internal teams on workflow improvements.",
      "Support dispute or incident coordination.",
    ],
    requiredSkills: ["Operations management", "Process improvement", "Cross-team coordination"],
    niceToHave: ["Marketplace operations experience"],
  }),
  makeRole({
    title: "Partnerships Manager",
    team: "Partnerships",
    locations: ["Oceania"],
    regionTag: "Oceania",
    workType: "Full-time",
    seniority: "Senior",
    summary: "Develop strategic partnerships across Oceania.",
    aboutRole:
      "You will build partnerships that expand supplier and service coverage in Oceania.",
    responsibilities: [
      "Identify and onboard strategic partners.",
      "Maintain partnership governance and expectations.",
      "Coordinate cross-functional support for partner success.",
    ],
    requiredSkills: ["Partnership management", "Commercial negotiation", "Relationship building"],
    niceToHave: ["Renewable energy sector network"],
  }),
  makeRole({
    title: "Frontend Engineer",
    team: "Engineering",
    locations: ["Remote"],
    regionTag: "Global",
    workType: "Full-time",
    seniority: "Mid",
    summary: "Build intuitive interfaces for a compliance-first marketplace.",
    aboutRole:
      "You will deliver user-facing experiences that make governance and workflows easy to follow.",
    responsibilities: ["Ship accessible UI components", "Collaborate with product and design", "Maintain UI quality"],
    requiredSkills: ["React/Next.js experience", "UI craftsmanship", "Accessibility awareness"],
    niceToHave: ["Design systems exposure", "Marketplace experience"],
  }),
  makeRole({
    title: "Backend Engineer",
    team: "Engineering",
    locations: ["Remote"],
    regionTag: "Global",
    workType: "Full-time",
    seniority: "Senior",
    summary: "Build secure services for compliance, orders, and integrations.",
    aboutRole:
      "You will design backend services and APIs that keep marketplace workflows reliable and auditable.",
    responsibilities: ["Design APIs for workflow integrity", "Maintain data integrity", "Integrate external systems"],
    requiredSkills: ["API design", "Security mindset", "Data modelling"],
    niceToHave: ["Payments or compliance platform experience"],
  }),
  makeRole({
    title: "Customer Support Specialist",
    team: "Customer Support",
    locations: ["NSW, Australia", "QLD, Australia"],
    regionTag: "AU",
    workType: "Full-time",
    seniority: "Junior",
    summary: "Support buyers and suppliers with clear, structured assistance.",
    aboutRole:
      "You will help marketplace participants resolve issues and navigate structured workflows.",
    responsibilities: ["Respond to support requests", "Document issues clearly", "Escalate complex cases"],
    requiredSkills: ["Clear communication", "Customer service experience", "Attention to detail"],
    niceToHave: ["Energy or marketplace experience"],
  }),
];

