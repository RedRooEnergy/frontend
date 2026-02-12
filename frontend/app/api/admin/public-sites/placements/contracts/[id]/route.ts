import { NextResponse, type NextRequest } from "next/server";
import { requireAdminActor } from "../../../../../../../lib/public-sites/authz";
import { updateContract } from "../../../../../../../lib/public-sites/services/PlacementEngineService";

export async function PUT(request: NextRequest, context: { params: { id: string } }) {
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

    const updated = updateContract(context.params.id, body);
    return NextResponse.json({ ok: true, updated });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Server error" }, { status: 400 });
  }
}
