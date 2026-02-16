import { NextResponse } from "next/server";
import {
  createCompliancePartner,
  listCompliancePartners,
} from "../../../../lib/compliancePartner/serverStore";
import { compliancePartnerRegistrySeed } from "../../../../data/compliancePartnerRegistrySeed";
import { CompliancePartnerRecord } from "../../../../lib/compliancePartner/types";
import { requireAdmin } from "../../../../lib/auth/adminGuard";

function buildSeedFallback(actorId: string) {
  const now = new Date().toISOString();
  return compliancePartnerRegistrySeed.map((seed) => ({
    ...seed,
    audit: {
      createdAt: now,
      createdBy: actorId,
      updatedAt: now,
      updatedBy: actorId,
      locked: false,
    },
  }));
}

export async function GET(request: Request) {
  const admin = requireAdmin(request.headers);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const items = await listCompliancePartners({});
    return NextResponse.json({ items });
  } catch (error) {
    if (error instanceof Error && error.message.includes("MONGODB_URI")) {
      return NextResponse.json({ items: buildSeedFallback(admin.actorId) });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to list compliance partners" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const admin = requireAdmin(request.headers);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const payload = (await request.json()) as CompliancePartnerRecord;
    const now = new Date().toISOString();
    const record: CompliancePartnerRecord = {
      ...payload,
      audit: {
        createdAt: now,
        createdBy: admin.actorId,
        updatedAt: now,
        updatedBy: admin.actorId,
        locked: false,
      },
    };
    const created = await createCompliancePartner(record);
    return NextResponse.json({ item: created }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create compliance partner" },
      { status: 500 }
    );
  }
}
