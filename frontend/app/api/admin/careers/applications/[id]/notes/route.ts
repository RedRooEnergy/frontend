import { NextResponse } from "next/server";
import { isAdminRequest } from "../../../../../../../lib/careers/adminAuth";
import { addApplicationNote } from "../../../../../../../lib/careers/store";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  if (!isAdminRequest(request.headers)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { note?: string };
  if (!body.note?.trim()) {
    return NextResponse.json({ error: "Note required" }, { status: 400 });
  }

  const updated = await addApplicationNote(params.id, body.note);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ application: updated });
}
