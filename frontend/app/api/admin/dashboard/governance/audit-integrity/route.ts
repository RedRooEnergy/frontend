import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../../lib/auth/adminGuard";
import { parsePositiveInt } from "../../../../../../lib/adminDashboard/http";
import { verifyAdminAuditLogIntegrity } from "../../../../../../lib/adminDashboard/auditWriter";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const admin = requireAdmin(request.headers);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const url = new URL(request.url);
    const limit = parsePositiveInt(url.searchParams.get("limit"), 5000, 50_000);
    const result = await verifyAdminAuditLogIntegrity({ limit });
    return NextResponse.json(result, { status: result.status === "PASS" ? 200 : 500 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to verify admin audit integrity" },
      { status: 500 }
    );
  }
}
