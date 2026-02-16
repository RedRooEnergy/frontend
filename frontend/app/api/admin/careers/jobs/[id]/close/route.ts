import { NextResponse } from "next/server";
import { isAdminRequest } from "../../../../../../../lib/careers/adminAuth";
import { setJobStatus } from "../../../../../../../lib/careers/store";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  if (!isAdminRequest(request.headers)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const job = await setJobStatus(params.id, "closed");
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ job });
}
