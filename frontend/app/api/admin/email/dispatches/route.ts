import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../lib/auth/adminGuard";
import { EmailDispatchStatus, listEmailDispatches } from "../../../../../lib/email/store";
import { EmailEventCode } from "../../../../../lib/email/events";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const admin = requireAdmin(request.headers);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const recipientUserId = searchParams.get("recipientUserId") || undefined;
  const recipientRole = (searchParams.get("recipientRole") as any) || undefined;
  const eventCode = (searchParams.get("eventCode") as EmailEventCode | null) || undefined;
  const sendStatus = (searchParams.get("sendStatus") as EmailDispatchStatus | null) || undefined;
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;
  const page = searchParams.get("page") ? Number(searchParams.get("page")) : undefined;
  const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined;

  const result = await listEmailDispatches({
    recipientUserId,
    recipientRole,
    eventCode,
    sendStatus,
    startDate,
    endDate,
    page,
    limit,
  });
  return NextResponse.json(result);
}
