import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../../lib/auth/adminGuard";
import { getGovernanceStatusSnapshot } from "../../../../../../lib/adminDashboard/governanceService";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const admin = requireAdmin(request.headers);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const status = await getGovernanceStatusSnapshot();
    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load governance status" },
      { status: 500 }
    );
  }
}
