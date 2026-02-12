import { NextResponse, type NextRequest } from "next/server";
import { requireAdminActor } from "../../../../../../lib/public-sites/authz";
import { createContract, listContracts } from "../../../../../../lib/public-sites/services/PlacementEngineService";

export async function GET(request: NextRequest) {
  const guard = requireAdminActor(request);
  if (!guard.ok) return guard.response;

  return NextResponse.json({ rows: listContracts() });
}

export async function POST(request: NextRequest) {
  const guard = requireAdminActor(request);
  if (!guard.ok) return guard.response;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      entityId?: string;
      entityType?: string;
      tier?: string;
      weeklyFeeAUD?: number;
      autoRenew?: boolean;
      status?: string;
      startWeekId?: string | null;
      endWeekId?: string | null;
    };

    const doc = createContract({
      entityId: String(body.entityId || "").trim(),
      entityType: String(body.entityType || ""),
      tier: String(body.tier || ""),
      weeklyFeeAUD: Number(body.weeklyFeeAUD || 0),
      autoRenew: body.autoRenew,
      status: body.status,
      startWeekId: body.startWeekId || null,
      endWeekId: body.endWeekId || null,
    });
    return NextResponse.json({ ok: true, doc });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Server error" }, { status: 400 });
  }
}
