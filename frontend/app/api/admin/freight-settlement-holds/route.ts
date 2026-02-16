import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/auth/adminGuard";
import {
  listPayoutSettlementHolds,
} from "../../../../lib/freightAudit/FreightSoftEnforcementService";
import type { FreightSettlementHoldStatus } from "../../../../lib/freightAudit/FreightSettlementHoldStore";

export const runtime = "nodejs";

function toStatus(value: string | null): FreightSettlementHoldStatus | undefined {
  if (!value) return undefined;
  if (value === "REVIEW_REQUIRED" || value === "OVERRIDDEN" || value === "RELEASED") return value;
  return undefined;
}

export async function GET(request: Request) {
  const admin = requireAdmin(request.headers);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const status = toStatus(searchParams.get("status"));
  const tenantId = String(searchParams.get("tenantId") || "").trim() || undefined;
  const orderId = String(searchParams.get("orderId") || "").trim() || undefined;
  const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined;

  try {
    const holds = await listPayoutSettlementHolds({
      status,
      tenantId,
      orderId,
      limit,
    });
    return NextResponse.json({ holds });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to list settlement holds" },
      { status: 500 }
    );
  }
}
