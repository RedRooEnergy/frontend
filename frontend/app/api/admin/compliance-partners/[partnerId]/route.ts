import { NextResponse } from "next/server";
import {
  getCompliancePartner,
  updateCompliancePartner,
} from "../../../../../lib/compliancePartner/serverStore";
import { requireAdmin } from "../../../../../lib/auth/adminGuard";

export async function GET(request: Request, context: { params: { partnerId: string } }) {
  const admin = requireAdmin(request.headers);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const item = await getCompliancePartner(context.params.partnerId);
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load compliance partner" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, context: { params: { partnerId: string } }) {
  const admin = requireAdmin(request.headers);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const updates = await request.json();
    const next = await updateCompliancePartner(context.params.partnerId, {
      ...updates,
      audit: {
        ...(updates.audit || {}),
        updatedAt: new Date().toISOString(),
        updatedBy: admin.actorId,
      },
    });
    return NextResponse.json({ item: next });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update compliance partner" },
      { status: 500 }
    );
  }
}
