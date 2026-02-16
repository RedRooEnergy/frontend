import { NextResponse } from "next/server";
import { compliancePartnerRegistrySeed } from "../../../../../data/compliancePartnerRegistrySeed";
import {
  createCompliancePartner,
  getCompliancePartner,
  updateCompliancePartner,
} from "../../../../../lib/compliancePartner/serverStore";
import { requireAdmin } from "../../../../../lib/auth/adminGuard";
import { CompliancePartnerRecord } from "../../../../../lib/compliancePartner/types";

export async function POST(request: Request) {
  const admin = requireAdmin(request.headers);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const now = new Date().toISOString();
  const summary = { created: 0, updated: 0, skippedLocked: 0 };

  try {
    for (const seed of compliancePartnerRegistrySeed) {
      const existing = await getCompliancePartner(seed.id);
      if (!existing) {
        const record: CompliancePartnerRecord = {
          ...seed,
          audit: {
            createdAt: now,
            createdBy: admin.actorId,
            updatedAt: now,
            updatedBy: admin.actorId,
            locked: false,
          },
        };
        await createCompliancePartner(record);
        summary.created += 1;
        continue;
      }

      if (existing.audit?.locked) {
        summary.skippedLocked += 1;
        continue;
      }

      const next: Partial<CompliancePartnerRecord> = {
        ...seed,
        audit: {
          createdAt: existing.audit.createdAt,
          createdBy: existing.audit.createdBy,
          updatedAt: now,
          updatedBy: admin.actorId,
          locked: existing.audit.locked,
          lockedAt: existing.audit.lockedAt,
          lockedBy: existing.audit.lockedBy,
        },
      };

      await updateCompliancePartner(seed.id, next);
      summary.updated += 1;
    }

    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to seed compliance partners" },
      { status: 500 }
    );
  }
}

