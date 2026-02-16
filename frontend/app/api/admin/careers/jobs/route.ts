import { NextResponse } from "next/server";
import { isAdminRequest } from "../../../../../lib/careers/adminAuth";
import { addJob, countApplicationsByJob, getJobs } from "../../../../../lib/careers/store";
import type { CareerJob } from "../../../../../lib/careers/types";

export async function GET(request: Request) {
  if (!isAdminRequest(request.headers)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const jobs = await getJobs();
  const counts = await countApplicationsByJob();
  const withCounts = jobs.map((job) => ({ ...job, applicants: counts[job.id] || 0 }));
  return NextResponse.json({ jobs: withCounts });
}

export async function POST(request: Request) {
  if (!isAdminRequest(request.headers)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as CareerJob;
  if (!body.title || !body.team || !body.locations?.length) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const created = await addJob({
    ...body,
    status: body.status || "draft",
    featured: body.featured ?? false,
    postedAt: body.postedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return NextResponse.json({ job: created });
}
