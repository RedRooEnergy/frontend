import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../lib/auth/adminGuard";
import { EMAIL_EVENTS } from "../../../../../lib/email/events";
import { listEmailEventPolicies, setEmailEventPolicy } from "../../../../../lib/email/store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const admin = requireAdmin(request.headers);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const policies = await listEmailEventPolicies();
  return NextResponse.json({
    policies,
    events: Object.values(EMAIL_EVENTS),
  });
}

export async function POST(request: Request) {
  const admin = requireAdmin(request.headers);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const eventCode = String(body.eventCode || "");
  const isDisabled = Boolean(body.isDisabled);
  if (!eventCode) return NextResponse.json({ error: "eventCode required" }, { status: 400 });
  const allowed = new Set<string>([...Object.values(EMAIL_EVENTS), "__ALL__"]);
  if (!allowed.has(eventCode)) {
    return NextResponse.json({ error: "Invalid eventCode" }, { status: 400 });
  }

  const policy = await setEmailEventPolicy({
    eventCode: eventCode as any,
    isDisabled,
    updatedBy: admin.actorId,
  });

  return NextResponse.json({ policy });
}
