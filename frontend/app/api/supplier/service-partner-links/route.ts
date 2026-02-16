import { NextResponse } from "next/server";
import { getSessionFromCookieHeader } from "../../../../lib/auth/sessionCookie";
import { getServicePartnerAccountLink, listServicePartnerAccountLinksForSupplier, upsertServicePartnerAccountLink } from "../../../../lib/feeLedgerStore";
import { getComplianceProfile } from "../../../../lib/servicePartner/serverStore";

export async function GET(request: Request) {
  const session = getSessionFromCookieHeader(request.headers.get("cookie"));
  if (!session || session.role !== "supplier") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const servicePartnerId = searchParams.get("servicePartnerId");
  if (servicePartnerId) {
    const link = await getServicePartnerAccountLink(session.userId, servicePartnerId);
    return NextResponse.json({ ok: true, link });
  }

  const links = await listServicePartnerAccountLinksForSupplier(session.userId);
  return NextResponse.json({ ok: true, links });
}

export async function POST(request: Request) {
  const session = getSessionFromCookieHeader(request.headers.get("cookie"));
  if (!session || session.role !== "supplier") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { servicePartnerId?: string };
  if (!body?.servicePartnerId) {
    return NextResponse.json({ error: "servicePartnerId required" }, { status: 400 });
  }

  const profile = await getComplianceProfile(body.servicePartnerId);
  if (!profile || !["APPROVED", "ACTIVE"].includes(profile.status)) {
    return NextResponse.json({ error: "Service partner not approved/active" }, { status: 400 });
  }

  const link = await upsertServicePartnerAccountLink({
    supplierId: session.userId,
    servicePartnerId: body.servicePartnerId,
    status: "ACTIVE",
    createdBy: session.userId,
  });

  return NextResponse.json({ ok: true, link });
}
