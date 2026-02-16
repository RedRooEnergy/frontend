import { NextResponse } from "next/server";
import { getApplication, reviewApplication } from "../../../../../../lib/compliance/store";
import { requireAdmin } from "../../../../../../lib/auth/adminGuard";
import { sendEmail } from "../../../../../../lib/email/dispatchService";
import { resolveSupplierRecipient } from "../../../../../../lib/email/recipientResolvers";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: { id: string } }) {
  const admin = requireAdmin(request.headers);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const payload = await request.json();
    const app = reviewApplication(
      context.params.id,
      payload.decision,
      payload.reasons || [],
      payload.notes,
      admin.actorId
    );

    const decision = String(payload.decision || "").toUpperCase();
    const eventCode =
      decision === "APPROVE"
        ? "COMPLIANCE_DOCUMENT_APPROVED"
        : decision === "REJECT"
        ? "COMPLIANCE_DOCUMENT_REJECTED"
        : "COMPLIANCE_DOCUMENT_REQUESTED";

    const source = getApplication(context.params.id);
    if (source) {
      const recipient = await resolveSupplierRecipient(source.supplierId);
      if (recipient) {
        const actionRequired =
          eventCode === "COMPLIANCE_DOCUMENT_APPROVED"
            ? "No action required."
            : eventCode === "COMPLIANCE_DOCUMENT_REJECTED"
            ? "Review the rejection reasons and submit an updated compliance pack."
            : "Please address the requested changes and resubmit.";

        try {
          await sendEmail({
            eventCode,
            recipient: {
              userId: recipient.userId,
              email: recipient.email,
              role: "supplier",
              displayName: recipient.displayName,
            },
            entityRefs: {
              primaryId: source.id,
              supplierId: source.supplierId,
              supplierEmail: recipient.email,
              referenceUrl: "/dashboard/supplier/compliance",
              actionRequired,
            },
          });
        } catch (emailError) {
          console.error("Compliance review email failed", emailError);
        }
      }
    }

    return NextResponse.json(app);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to review application" },
      { status: 500 }
    );
  }
}
