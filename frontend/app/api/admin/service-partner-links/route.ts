import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/auth/adminGuard";
import {
  getServicePartnerAccountLink,
  listServicePartnerAccountLinksForSupplier,
  setServicePartnerAccountLinkStatus,
  upsertServicePartnerAccountLink,
  ServicePartnerAccountLinkStatus,
} from "../../../../lib/feeLedgerStore";

export async function GET(request: Request) {
  const admin = requireAdmin(request.headers);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const supplierId = searchParams.get("supplierId");
  const servicePartnerId = searchParams.get("servicePartnerId");
  if (supplierId && servicePartnerId) {
    const link = await getServicePartnerAccountLink(supplierId, servicePartnerId);
    return NextResponse.json({ ok: true, link });
  }
  if (supplierId) {
    const links = await listServicePartnerAccountLinksForSupplier(supplierId);
    return NextResponse.json({ ok: true, links });
  }
  return NextResponse.json({ ok: true, links: [] });
}

export async function POST(request: Request) {
  const admin = requireAdmin(request.headers);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await request.json()) as {
    supplierId?: string;
    servicePartnerId?: string;
    status?: ServicePartnerAccountLinkStatus;
  };

  if (!body?.supplierId || !body?.servicePartnerId) {
    return NextResponse.json({ error: "supplierId/servicePartnerId required" }, { status: 400 });
  }

  if (body.status && body.status !== "PENDING") {
    await setServicePartnerAccountLinkStatus({
      supplierId: body.supplierId,
      servicePartnerId: body.servicePartnerId,
      status: body.status,
    });
    const link = await getServicePartnerAccountLink(body.supplierId, body.servicePartnerId);
    return NextResponse.json({ ok: true, link });
  }

  const link = await upsertServicePartnerAccountLink({
    supplierId: body.supplierId,
    servicePartnerId: body.servicePartnerId,
    status: body.status || "PENDING",
    createdBy: admin.actorId,
  });
  return NextResponse.json({ ok: true, link });
}
