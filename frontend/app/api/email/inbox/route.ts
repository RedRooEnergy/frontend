import { NextResponse } from "next/server";
import { getSessionFromCookieHeader } from "../../../../lib/auth/sessionCookie";
import { listEmailDispatches } from "../../../../lib/email/store";
import { EmailRecipientRole } from "../../../../lib/email/events";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = getSessionFromCookieHeader(request.headers.get("cookie"));
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.role as EmailRecipientRole;
  if (!["buyer", "supplier", "service-partner", "admin"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = searchParams.get("page") ? Number(searchParams.get("page")) : undefined;
  const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined;
  const eventCode = searchParams.get("eventCode") || undefined;
  const sendStatus = searchParams.get("sendStatus") || undefined;
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;
  const search = (searchParams.get("search") || "").toLowerCase();

  const result = await listEmailDispatches({
    recipientUserId: session.userId,
    recipientRole: role,
    page,
    limit,
    eventCode: eventCode as any,
    sendStatus: sendStatus as any,
    startDate,
    endDate,
  });

  if (!search) return NextResponse.json(result);

  const filtered = result.items.filter((row) => {
    const reference =
      row.entityRefs?.referenceId || row.entityRefs?.orderId || row.entityRefs?.primaryId || "";
    const haystack = `${row.eventCode} ${row.sendStatus} ${reference}`.toLowerCase();
    return haystack.includes(search);
  });

  return NextResponse.json({ ...result, items: filtered, total: filtered.length });
}
