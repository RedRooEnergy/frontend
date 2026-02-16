import { NextResponse } from "next/server";
import { getSessionFromCookieHeader } from "../../../../lib/auth/sessionCookie";
import { listFeeLedgerEvents, FeeLedgerActorRole, FeeLedgerEventType, FeeLedgerStatus } from "../../../../lib/feeLedgerStore";

function resolveActorRole(sessionRole: string, requested?: string | null): FeeLedgerActorRole | null {
  if (sessionRole === "supplier") return "supplier";
  if (sessionRole === "service-partner") {
    if (requested === "installer") return "installer";
    return "service_partner";
  }
  if (sessionRole === "admin") return (requested as FeeLedgerActorRole) || "supplier";
  return null;
}

export async function GET(request: Request) {
  const session = getSessionFromCookieHeader(request.headers.get("cookie"));
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const requestedRole = searchParams.get("actorRole");
  const requestedActorId = searchParams.get("actorId");
  const actorRole = resolveActorRole(session.role, requestedRole);
  if (!actorRole) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const allowedActorIds = new Set([session.userId, session.email, `${session.role}-user`]);
  const actorId = requestedActorId && allowedActorIds.has(requestedActorId) ? requestedActorId : session.userId;

  const eventType = searchParams.get("eventType") as FeeLedgerEventType | null;
  const status = searchParams.get("status") as FeeLedgerStatus | null;
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;
  const page = searchParams.get("page") ? Number(searchParams.get("page")) : undefined;
  const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined;

  const result = await listFeeLedgerEvents({
    actorRole,
    actorId,
    eventType: eventType || undefined,
    status: status || undefined,
    startDate,
    endDate,
    page,
    limit,
  });

  return NextResponse.json(result);
}
