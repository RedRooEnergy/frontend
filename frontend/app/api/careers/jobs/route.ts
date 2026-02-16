import { NextResponse } from "next/server";
import { getPublishedJobs } from "../../../../lib/careers/store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.toLowerCase() || "";
  const location = searchParams.get("location");
  const team = searchParams.get("team");
  const workType = searchParams.get("workType");
  const seniority = searchParams.get("seniority");
  const region = searchParams.get("region");

  let jobs = await getPublishedJobs();
  if (search) {
    jobs = jobs.filter(
      (job) =>
        job.title.toLowerCase().includes(search) ||
        job.summary.toLowerCase().includes(search) ||
        job.team.toLowerCase().includes(search)
    );
  }
  if (location) {
    jobs = jobs.filter((job) => job.locations.includes(location));
  }
  if (team) {
    jobs = jobs.filter((job) => job.team === team);
  }
  if (workType) {
    jobs = jobs.filter((job) => job.workType === workType);
  }
  if (seniority) {
    jobs = jobs.filter((job) => job.seniority === seniority);
  }
  if (region) {
    jobs = jobs.filter((job) => job.regionTag === region);
  }

  return NextResponse.json({ jobs, total: jobs.length });
}
