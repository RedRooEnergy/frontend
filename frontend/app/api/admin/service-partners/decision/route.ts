import { NextResponse } from "next/server";
import { ServicePartnerComplianceProfile } from "../../../../../lib/store";
import { appendAuditLog, getComplianceProfile, upsertComplianceProfile } from "../../../../../lib/servicePartner/serverStore";
import { requireAdmin } from "../../../../../lib/auth/adminGuard";

export async function POST(request: Request) {
  const admin = requireAdmin(request.headers);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = (await request.json()) as {
      partnerId?: string;
      status?: ServicePartnerComplianceProfile["status"];
      reasonCode?: string;
      notes?: string;
      reviewerNotes?: string;
      unlockedSections?: string[];
      checklist?: Record<string, boolean>;
      actorId?: string;
    };

    if (!body.partnerId || !body.status || !body.reasonCode) {
      return NextResponse.json({ error: "Missing decision data." }, { status: 400 });
    }

    const checklist = body.checklist || {};
    const checklistPassed = Object.values(checklist).every(Boolean);
    if (!checklistPassed) {
      return NextResponse.json({ error: "Review checklist incomplete." }, { status: 400 });
    }

    if (body.status === "CHANGES_REQUIRED") {
      if (!body.unlockedSections || body.unlockedSections.length === 0) {
        return NextResponse.json({ error: "Select sections to unlock." }, { status: 400 });
      }
      if (!body.notes || !body.notes.trim()) {
        return NextResponse.json({ error: "Change request note required." }, { status: 400 });
      }
    }

    const existing = await getComplianceProfile(body.partnerId);
    if (!existing) {
      return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    }

    // Activation is a separate governed action and must follow approval.
    if (body.status === "ACTIVE" && existing.status !== "APPROVED" && existing.status !== "ACTIVE") {
      return NextResponse.json({ error: "Profile must be APPROVED before activation." }, { status: 400 });
    }

    const next: ServicePartnerComplianceProfile = {
      ...existing,
      status: body.status,
      unlockedSections: body.status === "CHANGES_REQUIRED" ? body.unlockedSections ?? [] : [],
      changeRequestNote: body.status === "CHANGES_REQUIRED" ? body.notes : existing.changeRequestNote,
      adminReviewNotes: body.reviewerNotes ?? existing.adminReviewNotes,
      updatedAt: new Date().toISOString(),
    };

    const saved = await upsertComplianceProfile(next);

    await appendAuditLog({
      id: crypto.randomUUID(),
      actorId: admin.actorId,
      actorRole: "admin",
      action: "SERVICE_PARTNER_DECISION",
      targetType: "service-partner-compliance",
      targetId: body.partnerId,
      reasonCode: body.reasonCode,
      notes: body.notes,
      metadata: {
        previousStatus: existing.status,
        status: body.status,
        unlockedSections: (body.unlockedSections || []).join(","),
      },
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ profile: saved });
  } catch (err) {
    return NextResponse.json({ error: "Unable to apply decision." }, { status: 500 });
  }
}
