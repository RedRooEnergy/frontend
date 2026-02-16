import { NextResponse } from "next/server";
import { validateComplianceProfile } from "../../../../../lib/servicePartnerComplianceValidation";
import { ServicePartnerComplianceProfile } from "../../../../../lib/store";
import { appendAuditLog, getComplianceProfile, upsertComplianceProfile } from "../../../../../lib/servicePartner/serverStore";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ServicePartnerComplianceProfile;
    if (!body?.partnerId) {
      return NextResponse.json({ error: "Invalid profile submission." }, { status: 400 });
    }
    const existing = await getComplianceProfile(body.partnerId);
    if (existing?.status === "SUBMITTED") {
      return NextResponse.json(
        {
          ok: true,
          profile: existing,
          locked: true,
          message: "Submitted for review. Fields are locked pending admin decision.",
        },
        { status: 200 }
      );
    }
    const errors = validateComplianceProfile(body);
    if (errors.length > 0) {
      return NextResponse.json({ error: "Validation failed", errors }, { status: 400 });
    }
    const next = { ...body, status: "SUBMITTED" as const };
    const saved = await upsertComplianceProfile(next);
    const auditId = crypto.randomUUID();
    await appendAuditLog({
      id: auditId,
      actorId: body.partnerId,
      actorRole: "service-partner",
      action: "SERVICE_PARTNER_SUBMITTED",
      targetType: "service-partner-compliance",
      targetId: body.partnerId,
      reasonCode: "SUBMIT_FOR_REVIEW",
      notes: "Submitted for admin review",
      metadata: { status: "SUBMITTED" },
      createdAt: new Date().toISOString(),
    });
    return NextResponse.json({
      ok: true,
      profile: saved,
      auditId,
      message: "Submitted for review. Fields are locked pending admin decision.",
    });
  } catch (err) {
    return NextResponse.json({ error: "Unable to process submission." }, { status: 500 });
  }
}
