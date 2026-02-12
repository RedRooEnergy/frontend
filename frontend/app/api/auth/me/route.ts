import { NextResponse, type NextRequest } from "next/server";
import { getActorFromRequest } from "../../../../lib/auth/request";
import { unauthorized } from "../../../../lib/api/http";

export async function GET(request: NextRequest) {
  const actor = getActorFromRequest(request);
  if (!actor) return unauthorized();
  return NextResponse.json({ actor });
}
