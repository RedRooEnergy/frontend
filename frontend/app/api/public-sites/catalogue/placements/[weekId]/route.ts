import { NextResponse } from "next/server";
import { resolveCataloguePlacementCards } from "../../../../../../lib/public-sites/services/PlacementEngineService";

export async function GET(_: Request, context: { params: { weekId: string } }) {
  const weekId = String(context.params.weekId || "");
  if (!/^\d{4}-\d{2}$/.test(weekId)) {
    return NextResponse.json({ error: "Invalid weekId" }, { status: 400 });
  }
  return NextResponse.json({
    weekId,
    sectionLabel: "Service Partners (Paid Placements)",
    cards: resolveCataloguePlacementCards(weekId),
  });
}
