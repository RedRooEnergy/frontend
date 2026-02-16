import { NextResponse } from "next/server";
import { isAdminRequest } from "../../../../../lib/careers/adminAuth";
import { getApplications } from "../../../../../lib/careers/store";

export async function GET(request: Request) {
  if (!isAdminRequest(request.headers)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role");
  const status = searchParams.get("status");
  const region = searchParams.get("region");
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  let apps = await getApplications();
  if (role) {
    apps = apps.filter((app) => app.roleOfInterest === role || app.jobTitle === role);
  }
  if (status) {
    apps = apps.filter((app) => app.status === status);
  }
  if (region) {
    apps = apps.filter((app) => app.locationCountry === region || app.locationCountry.includes(region));
  }
  if (start) {
    const startDate = new Date(start).getTime();
    apps = apps.filter((app) => new Date(app.createdAt).getTime() >= startDate);
  }
  if (end) {
    const endDate = new Date(end).getTime();
    apps = apps.filter((app) => new Date(app.createdAt).getTime() <= endDate);
  }

  return NextResponse.json({ applications: apps });
}
