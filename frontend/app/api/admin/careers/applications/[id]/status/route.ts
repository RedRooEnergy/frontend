import { NextResponse } from "next/server";
import { isAdminRequest } from "../../../../../../../lib/careers/adminAuth";
import { updateApplicationStatus } from "../../../../../../../lib/careers/store";
import type { CareerApplicationStatus } from "../../../../../../../lib/careers/types";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  if (!isAdminRequest(request.headers)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { status?: CareerApplicationStatus };
  if (!body.status) {
    return NextResponse.json({ error: "Status required" }, { status: 400 });
  }

  const updated = await updateApplicationStatus(params.id, body.status);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ application: updated });
}
