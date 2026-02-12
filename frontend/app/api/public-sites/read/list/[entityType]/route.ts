import { NextResponse } from "next/server";
import { listPublishedParticipants } from "../../../../../../lib/public-sites/services/PublicSiteService";

export async function GET(_: Request, context: { params: { entityType: string } }) {
  try {
    const rows = listPublishedParticipants(context.params.entityType);
    return NextResponse.json({ rows });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Server error" }, { status: 400 });
  }
}
