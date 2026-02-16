import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../lib/auth/adminGuard";
import { summarizeFeeLedgerEvents, FeeLedgerActorRole, FeeLedgerEventType, FeeLedgerStatus } from "../../../../../lib/feeLedgerStore";

export async function GET(request: Request) {
  const admin = requireAdmin(request.headers);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const actorRole = searchParams.get("actorRole") as FeeLedgerActorRole | null;
  const eventType = searchParams.get("eventType") as FeeLedgerEventType | null;
  const status = searchParams.get("status") as FeeLedgerStatus | null;
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;

  const summary = await summarizeFeeLedgerEvents({
    actorRole: actorRole || undefined,
    eventType: eventType || undefined,
    status: status || undefined,
    startDate,
    endDate,
  });

  return NextResponse.json({ ok: true, summary });
}
