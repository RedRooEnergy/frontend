export type CareerTeam =
  | "Engineering"
  | "Compliance"
  | "Logistics"
  | "Sales"
  | "Partnerships"
  | "Operations"
  | "Marketing"
  | "Finance"
  | "Legal"
  | "Customer Support";

export type CareerWorkType = "Full-time" | "Part-time" | "Contract" | "Casual";

export type CareerSeniority = "Junior" | "Mid" | "Senior" | "Lead";

export type CareerRegion = "AU" | "NZ" | "China" | "Oceania" | "Global";

export type CareerJobStatus = "draft" | "published" | "closed";

export interface CareerJobSections {
  aboutRole: string;
  responsibilities: string[];
  requiredSkills: string[];
  niceToHave: string[];
  regionNotes?: string;
  assessment?: string;
}

export interface CareerJob {
  id: string;
  title: string;
  slug: string;
  refCode: string;
  team: CareerTeam;
  locations: string[];
  regionTag: CareerRegion;
  workType: CareerWorkType;
  seniority: CareerSeniority;
  summary: string;
  sections: CareerJobSections;
  compensationMin?: number;
  compensationMax?: number;
  currency?: string;
  status: CareerJobStatus;
  featured: boolean;
  postedAt: string;
  updatedAt: string;
}

export type CareerApplicationType = "job" | "talent_pool";

export type CareerApplicationStatus = "new" | "screening" | "interview" | "offer" | "hired" | "rejected";

export type CareerAttachmentKind = "resume" | "cover_letter" | "supporting";

export interface CareerAttachment {
  kind: CareerAttachmentKind;
  fileName: string;
  fileType: string;
  fileSize: number;
  storageKey: string;
  url?: string;
  uploadedAt: string;
}

export interface CareerStatusHistoryEntry {
  status: CareerApplicationStatus;
  changedAt: string;
  changedBy: string;
}

export interface CareerAdminNote {
  note: string;
  createdAt: string;
  author: string;
}

export interface CareerApplication {
  id: string;
  referenceId: string;
  jobId?: string | null;
  jobSlug?: string | null;
  jobTitle?: string | null;
  type: CareerApplicationType;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  locationCity: string;
  locationCountry: string;
  workRights: string;
  roleOfInterest: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  salaryExpectation?: string;
  startDate?: string;
  coverLetterText?: string;
  source?: string;
  consent: boolean;
  attachments: CareerAttachment[];
  status: CareerApplicationStatus;
  statusHistory: CareerStatusHistoryEntry[];
  adminNotes: CareerAdminNote[];
  createdAt: string;
  updatedAt: string;
}

export interface CareerApplicationInput {
  jobId?: string | null;
  jobSlug?: string | null;
  type: CareerApplicationType;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  locationCity: string;
  locationCountry: string;
  workRights: string;
  roleOfInterest: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  salaryExpectation?: string;
  startDate?: string;
  coverLetterText?: string;
  source?: string;
  consent: boolean;
  attachments: CareerAttachment[];
  honeypot?: string;
}

