import type { CareerRegion, CareerSeniority, CareerTeam, CareerWorkType } from "../lib/careers/types";

export const CAREER_TEAMS: CareerTeam[] = [
  "Engineering",
  "Compliance",
  "Logistics",
  "Sales",
  "Partnerships",
  "Operations",
  "Marketing",
  "Finance",
  "Legal",
  "Customer Support",
];

export const CAREER_WORK_TYPES: CareerWorkType[] = ["Full-time", "Part-time", "Contract", "Casual"];

export const CAREER_SENIORITY: CareerSeniority[] = ["Junior", "Mid", "Senior", "Lead"];

export const CAREER_REGIONS: CareerRegion[] = ["AU", "NZ", "China", "Oceania", "Global"];

export const CAREER_LOCATIONS = [
  "Remote",
  "NSW, Australia",
  "VIC, Australia",
  "QLD, Australia",
  "WA, Australia",
  "SA, Australia",
  "TAS, Australia",
  "ACT, Australia",
  "NT, Australia",
  "New Zealand",
  "China",
  "Oceania",
];

export const CAREER_WORK_RIGHTS = [
  "Australian citizen or PR",
  "New Zealand citizen or resident",
  "China work rights",
  "Oceania work rights",
  "Global work rights / remote eligible",
  "Require sponsorship",
];

export const CAREER_SOURCES = [
  "LinkedIn",
  "Referral",
  "Company website",
  "Recruiter",
  "Industry network",
  "Event or conference",
  "Other",
];

export const careersCopy = {
  heroTitle: "Careers at RedRooEnergy",
  heroSubtitle: "Build the compliance-led renewable marketplace that connects global suppliers with Australian buyers.",
  heroPrimaryCta: "View open roles",
  heroSecondaryCta: "Join our talent pool",
  whyTitle: "Why work with us",
  whyCards: [
    "Mission-led marketplace built on trust and compliance.",
    "Real impact on clean energy adoption in Australia.",
    "International growth across Australia, China, NZ, and Oceania.",
    "Governance-first culture with clear standards.",
    "Remote and hybrid-friendly roles where practical.",
    "Professional teams focused on quality and accountability.",
  ],
  openRolesTitle: "Open roles",
  hiringTitle: "How hiring works",
  hiringSteps: ["Apply", "Review", "Interview", "Offer / Onboarding"],
  talentPoolTitle: "Talent pool",
  talentPoolSubtitle: "Join our talent pool for future roles.",
  talentPoolNote:
    "Share your details once and we will reach out when a suitable opportunity becomes available.",
  faqTitle: "Recruiting FAQs",
  filtersTitle: "Filter roles",
};

export const careersFaq = [
  {
    question: "Do I need Australian work rights to apply?",
    answer: "Not always. Some roles require local work rights, while others are open to global or regional candidates.",
  },
  {
    question: "Do you support remote work?",
    answer: "Yes, for roles that can be performed remotely. Each role lists the expected location or region.",
  },
  {
    question: "What time zones do you work across?",
    answer: "We operate across Australia, New Zealand, China, and Oceania, with coordination across time zones as needed.",
  },
  {
    question: "What languages are expected?",
    answer: "English is the primary working language. Additional languages can be helpful for regional roles.",
  },
  {
    question: "Will I need to travel?",
    answer: "Some roles involve travel. This is always outlined in the role details.",
  },
  {
    question: "How long does the hiring process take?",
    answer: "Most roles move through review and interviews within a few weeks, depending on availability.",
  },
  {
    question: "Can I apply for more than one role?",
    answer: "Yes. If multiple roles fit your skills, you can apply to each one.",
  },
  {
    question: "Do you accept general applications?",
    answer: "Yes. Use the talent pool form to share your details for future opportunities.",
  },
  {
    question: "How are applications assessed?",
    answer: "We review experience, role fit, compliance awareness, and alignment with our marketplace standards.",
  },
  {
    question: "Will I hear back if I am not selected?",
    answer: "We aim to respond, but timing can vary based on volume. You can always reapply for future roles.",
  },
];

export const careersFormCopy = {
  sectionTitle: "Apply for this role",
  talentPoolTitle: "Join the talent pool",
  consentLabel: "I confirm the information is accurate.",
  submitJob: "Submit application",
  submitTalent: "Submit talent pool profile",
  successTitle: "Application received",
  successBody:
    "Thanks for your submission. We will review your details and contact you if there is a match.",
};

export const careersFormLabels = {
  firstName: "First name",
  lastName: "Last name",
  email: "Email",
  phone: "Phone",
  locationCity: "Location (city)",
  locationCountry: "Location (country)",
  workRights: "Work rights / eligibility",
  roleOfInterest: "Role of interest",
  linkedinUrl: "LinkedIn URL",
  portfolioUrl: "Portfolio URL",
  salaryExpectation: "Salary expectation",
  startDate: "Available start date",
  coverLetterText: "Cover letter (optional)",
  source: "How did you hear about us?",
  resume: "CV / Resume",
  coverLetterFile: "Cover letter file",
  supportingDocs: "Supporting documents (up to 3)",
};
