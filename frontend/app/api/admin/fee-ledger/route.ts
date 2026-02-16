import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/auth/adminGuard";
import {
  emitFeeLedgerEvent,
  listFeeLedgerEvents,
  FeeLedgerActorRole,
  FeeLedgerEventType,
  FeeLedgerEntityType,
  FeePolicyTriggerEvent,
} from "../../../../lib/feeLedgerStore";

type CreatePayload = {
  triggerEvent: FeePolicyTriggerEvent;
  eventType: FeeLedgerEventType;
  actorRole: FeeLedgerActorRole;
  actorId: string;
  relatedEntityType: FeeLedgerEntityType;
  relatedEntityId: string;
  baseAmount: number;
  currency: "AUD" | "NZD";
};

export async function POST(request: Request) {
  const admin = requireAdmin(request.headers);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = (await request.json()) as Partial<CreatePayload>;

  if (
    !body?.triggerEvent ||
    !body?.eventType ||
    !body?.actorRole ||
    !body?.actorId ||
    !body?.relatedEntityType ||
    !body?.relatedEntityId ||
    !body?.baseAmount ||
    !body?.currency
  ) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const event = await emitFeeLedgerEvent({
      triggerEvent: body.triggerEvent,
      eventType: body.eventType,
      actorRole: body.actorRole,
      actorId: body.actorId,
      relatedEntityType: body.relatedEntityType,
      relatedEntityId: body.relatedEntityId,
      baseAmount: Number(body.baseAmount),
      currency: body.currency,
      createdByRole: "admin",
      createdById: admin.actorId,
    });
    return NextResponse.json({ ok: true, event });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to create fee event" }, { status: 400 });
  }
}

export async function GET(request: Request) {
  const admin = requireAdmin(request.headers);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const actorRole = searchParams.get("actorRole") as FeeLedgerActorRole | null;
  const actorId = searchParams.get("actorId");
  const eventType = searchParams.get("eventType") as FeeLedgerEventType | null;
  const status = searchParams.get("status") as any;
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;
  const page = searchParams.get("page") ? Number(searchParams.get("page")) : undefined;
  const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined;

  const result = await listFeeLedgerEvents({
    actorRole: actorRole || undefined,
    actorId: actorId || undefined,
    eventType: eventType || undefined,
    status: status || undefined,
    startDate,
    endDate,
    page,
    limit,
  });

  return NextResponse.json(result);
}
