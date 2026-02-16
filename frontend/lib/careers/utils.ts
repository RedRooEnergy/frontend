import crypto from "crypto";
import type { CareerJob, CareerTeam } from "./types";

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const TEAM_CODES: Record<CareerTeam, string> = {
  Engineering: "ENG",
  Compliance: "COMP",
  Logistics: "LOG",
  Sales: "SALES",
  Partnerships: "PART",
  Operations: "OPS",
  Marketing: "MKT",
  Finance: "FIN",
  Legal: "LEGAL",
  "Customer Support": "SUP",
};

export function generateRefCode(team: CareerTeam) {
  const date = new Date();
  const stamp = `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  const rand = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `RRE-${TEAM_CODES[team]}-${stamp}-${rand}`;
}

export function generateApplicationReference() {
  const date = new Date();
  const stamp = `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(
    date.getUTCDate()
  ).padStart(2, "0")}`;
  const rand = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `APP-${stamp}-${rand}`;
}

export function normalizeJob(job: CareerJob): CareerJob {
  const now = new Date().toISOString();
  return {
    ...job,
    slug: job.slug || slugify(job.title),
    refCode: job.refCode || generateRefCode(job.team),
    postedAt: job.postedAt || now,
    updatedAt: now,
    featured: job.featured ?? false,
  };
}

export function safeParseNumber(value: string | undefined) {
  if (!value) return undefined;
  const num = Number(value);
  if (Number.isNaN(num)) return undefined;
  return num;
}

