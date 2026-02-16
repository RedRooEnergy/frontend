import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { seedJobs } from "../../data/careersSeed";
import type {
  CareerApplication,
  CareerApplicationStatus,
  CareerApplicationType,
  CareerJob,
  CareerJobStatus,
} from "./types";
import { generateApplicationReference, generateRefCode, normalizeJob, slugify } from "./utils";

const STORE_DIR = path.join(process.cwd(), "data", "careers");
const JOBS_FILE = path.join(STORE_DIR, "jobs.json");
const APPLICATIONS_FILE = path.join(STORE_DIR, "applications.json");

async function ensureDir() {
  await fs.mkdir(STORE_DIR, { recursive: true });
}

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(filePath: string, value: T) {
  await ensureDir();
  await fs.writeFile(filePath, JSON.stringify(value, null, 2));
}

function buildSeedJobs(): CareerJob[] {
  const now = new Date().toISOString();
  return seedJobs.map((job, idx) => ({
    ...job,
    id: crypto.randomUUID(),
    slug: slugify(job.title),
    refCode: generateRefCode(job.team),
    postedAt: now,
    updatedAt: now,
    featured: job.featured ?? idx === 0,
  }));
}

export async function getJobs(): Promise<CareerJob[]> {
  await ensureDir();
  const jobs = await readJson<CareerJob[]>(JOBS_FILE, []);
  if (jobs.length === 0) {
    const seeded = buildSeedJobs();
    await writeJson(JOBS_FILE, seeded);
    return seeded;
  }
  return jobs;
}

export async function writeJobs(jobs: CareerJob[]) {
  await writeJson(JOBS_FILE, jobs);
}

export async function getPublishedJobs() {
  const jobs = await getJobs();
  return jobs.filter((job) => job.status === "published");
}

export async function getJobBySlug(slug: string) {
  const jobs = await getJobs();
  return jobs.find((job) => job.slug === slug) || null;
}

export async function getJobById(id: string) {
  const jobs = await getJobs();
  return jobs.find((job) => job.id === id) || null;
}

export async function addJob(input: CareerJob) {
  const jobs = await getJobs();
  const now = new Date().toISOString();
  const job: CareerJob = normalizeJob({
    ...input,
    id: input.id || crypto.randomUUID(),
    slug: input.slug || slugify(input.title),
    refCode: input.refCode || generateRefCode(input.team),
    postedAt: input.postedAt || now,
    updatedAt: now,
  });
  jobs.unshift(job);
  await writeJobs(jobs);
  return job;
}

export async function updateJob(id: string, updates: Partial<CareerJob>) {
  const jobs = await getJobs();
  const idx = jobs.findIndex((job) => job.id === id);
  if (idx === -1) return null;
  const current = jobs[idx];
  const next: CareerJob = {
    ...current,
    ...updates,
    slug: updates.slug || (updates.title ? slugify(updates.title) : current.slug),
    updatedAt: new Date().toISOString(),
  };
  jobs[idx] = next;
  await writeJobs(jobs);
  return next;
}

export async function setJobStatus(id: string, status: CareerJobStatus) {
  return updateJob(id, { status });
}

export async function getApplications(): Promise<CareerApplication[]> {
  await ensureDir();
  return readJson<CareerApplication[]>(APPLICATIONS_FILE, []);
}

export async function writeApplications(apps: CareerApplication[]) {
  await writeJson(APPLICATIONS_FILE, apps);
}

export async function addApplication(application: CareerApplication) {
  const applications = await getApplications();
  applications.unshift(application);
  await writeApplications(applications);
  return application;
}

export async function getApplicationById(id: string) {
  const applications = await getApplications();
  return applications.find((app) => app.id === id) || null;
}

export async function updateApplicationStatus(
  id: string,
  status: CareerApplicationStatus,
  actor = "admin"
) {
  const applications = await getApplications();
  const idx = applications.findIndex((app) => app.id === id);
  if (idx === -1) return null;
  const next = {
    ...applications[idx],
    status,
    updatedAt: new Date().toISOString(),
    statusHistory: [
      ...applications[idx].statusHistory,
      { status, changedAt: new Date().toISOString(), changedBy: actor },
    ],
  };
  applications[idx] = next;
  await writeApplications(applications);
  return next;
}

export async function addApplicationNote(id: string, note: string, actor = "admin") {
  const applications = await getApplications();
  const idx = applications.findIndex((app) => app.id === id);
  if (idx === -1) return null;
  const next = {
    ...applications[idx],
    updatedAt: new Date().toISOString(),
    adminNotes: [
      ...applications[idx].adminNotes,
      { note, createdAt: new Date().toISOString(), author: actor },
    ],
  };
  applications[idx] = next;
  await writeApplications(applications);
  return next;
}

export async function countApplicationsByJob() {
  const applications = await getApplications();
  return applications.reduce<Record<string, number>>((acc, app) => {
    const key = app.jobId || "talent_pool";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

export function buildApplicationRecord(params: {
  input: Omit<
    CareerApplication,
    "id" | "referenceId" | "status" | "statusHistory" | "adminNotes" | "createdAt" | "updatedAt" | "type"
  >;
  type: CareerApplicationType;
}): CareerApplication {
  const now = new Date().toISOString();
  return {
    ...params.input,
    type: params.type,
    id: crypto.randomUUID(),
    referenceId: generateApplicationReference(),
    status: "new" as CareerApplicationStatus,
    statusHistory: [
      {
        status: "new" as CareerApplicationStatus,
        changedAt: now,
        changedBy: "system",
      },
    ],
    adminNotes: [],
    createdAt: now,
    updatedAt: now,
  };
}
