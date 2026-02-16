import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../lib/auth/adminGuard";
import { getPayoutSettlementHold } from "../../../../../lib/freightAudit/FreightSoftEnforcementService";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: { holdId: string } }) {
  const admin = requireAdmin(request.headers);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const holdId = String(context.params.holdId || "").trim();
  if (!holdId) return NextResponse.json({ error: "holdId required" }, { status: 400 });

  try {
    const hold = await getPayoutSettlementHold(holdId);
    if (!hold) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ hold });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load settlement hold" },
      { status: 500 }
    );
  }
}
