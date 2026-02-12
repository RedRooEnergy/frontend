import { NextResponse, type NextRequest } from "next/server";
import { requireRegulatorActor } from "../../../../../lib/public-sites/authz";
import { verifyHash } from "../../../../../lib/public-sites/services/PublicSiteService";

export async function GET(request: NextRequest) {
  const guard = requireRegulatorActor(request);
  if (!guard.ok) return guard.response;

  const hash = String(request.nextUrl.searchParams.get("hash") || "").trim();
  if (!hash || hash.length < 32) {
    return NextResponse.json({ error: "Invalid hash" }, { status: 400 });
  }

  return NextResponse.json(verifyHash({ hash }));
}
