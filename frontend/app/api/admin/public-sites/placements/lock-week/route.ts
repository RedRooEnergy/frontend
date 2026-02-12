import { NextResponse, type NextRequest } from "next/server";
import { requireAdminActor } from "../../../../../../lib/public-sites/authz";
import { lockWeekPlacements } from "../../../../../../lib/public-sites/services/PlacementEngineService";

export async function POST(request: NextRequest) {
  const guard = requireAdminActor(request);
  if (!guard.ok) return guard.response;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      weekId?: string;
      capsByTier?: { BASIC?: number; FEATURED?: number; SPOTLIGHT?: number };
    };

    const weekId = String(body.weekId || "");
    if (!/^\d{4}-\d{2}$/.test(weekId)) {
      return NextResponse.json({ error: "Invalid weekId" }, { status: 400 });
    }

    const out = lockWeekPlacements({
      weekId,
      capsByTier: {
        BASIC: Number(body.capsByTier?.BASIC ?? 50),
        FEATURED: Number(body.capsByTier?.FEATURED ?? 10),
        SPOTLIGHT: Number(body.capsByTier?.SPOTLIGHT ?? 3),
      },
      adminId: guard.actor.userId,
    });

    return NextResponse.json(out);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Server error" }, { status: 400 });
  }
}
