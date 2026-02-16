import { NextResponse } from "next/server";
import { isAdminRequest } from "../../../../../../lib/careers/adminAuth";
import { getJobById, updateJob } from "../../../../../../lib/careers/store";
import type { CareerJob } from "../../../../../../lib/careers/types";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  if (!isAdminRequest(request.headers)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const job = await getJobById(params.id);
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ job });
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  if (!isAdminRequest(request.headers)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await request.json()) as Partial<CareerJob>;
  const updated = await updateJob(params.id, body);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ job: updated });
}
