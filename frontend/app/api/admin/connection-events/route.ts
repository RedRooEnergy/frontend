import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/auth/adminGuard";
import {
  createConnectionEvent,
  listConnectionEvents,
} from "../../../../lib/connectionEventsStore";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const admin = requireAdmin(request.headers);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  try {
    const event = await createConnectionEvent({
      sourceType: body.sourceType,
      sourceId: body.sourceId,
      servicePartnerId: body.servicePartnerId,
      engagementType: body.engagementType,
      eventAt: body.eventAt,
      status: body.status,
      notes: body.notes,
      createdByRole: "admin",
      createdById: admin.actorId,
    });
    return NextResponse.json({ ok: true, event });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unable to create event" }, { status: 400 });
  }
}

export async function GET(request: Request) {
  const admin = requireAdmin(request.headers);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const list = await listConnectionEvents({
    servicePartnerId: url.searchParams.get("servicePartnerId") || undefined,
    sourceType: (url.searchParams.get("sourceType") as any) || undefined,
    status: (url.searchParams.get("status") as any) || undefined,
    startDate: url.searchParams.get("startDate") || undefined,
    endDate: url.searchParams.get("endDate") || undefined,
    page: url.searchParams.get("page") ? Number(url.searchParams.get("page")) : undefined,
    limit: url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : undefined,
  });

  return NextResponse.json({ ok: true, ...list });
}
