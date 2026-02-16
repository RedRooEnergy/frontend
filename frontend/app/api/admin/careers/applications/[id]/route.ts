import { NextResponse } from "next/server";
import { isAdminRequest } from "../../../../../../lib/careers/adminAuth";
import { getApplicationById } from "../../../../../../lib/careers/store";
import { getDownloadUrl } from "../../../../../../lib/careers/storage";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  if (!isAdminRequest(request.headers)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const application = await getApplicationById(params.id);
  if (!application) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const attachments = application.attachments.map((att) => ({
    ...att,
    downloadUrl: att.storageKey ? getDownloadUrl(att.storageKey) : att.url,
  }));

  return NextResponse.json({ application: { ...application, attachments } });
}
