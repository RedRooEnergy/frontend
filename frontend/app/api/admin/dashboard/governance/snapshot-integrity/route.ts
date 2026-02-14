import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../../lib/auth/adminGuard";
import { verifyGovernanceSnapshotIntegrity } from "../../../../../../lib/adminDashboard/governanceService";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const admin = requireAdmin(request.headers);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const result = await verifyGovernanceSnapshotIntegrity();
    return NextResponse.json(result, { status: result.status === "PASS" ? 200 : 500 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to verify governance snapshot integrity" },
      { status: 500 }
    );
  }
}
