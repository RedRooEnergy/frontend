import { NextResponse } from "next/server";
import { getApplication, submitApplication } from "../../../../../../lib/compliance/store";
import { requireSupplier } from "../../../../../../lib/auth/roleGuard";
import { sendEmail } from "../../../../../../lib/email/dispatchService";
import { resolveSupplierRecipient } from "../../../../../../lib/email/recipientResolvers";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: { id: string } }) {
  const supplier = requireSupplier(request.headers);
  if (!supplier) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const app = submitApplication(context.params.id);
    return NextResponse.json(app);
  } catch (error: any) {
    const status = error?.status || 500;

    if (status === 409) {
      const app = getApplication(context.params.id);
      if (app) {
        const recipient = await resolveSupplierRecipient(app.supplierId);
        if (recipient) {
          try {
            await sendEmail({
              eventCode: "COMPLIANCE_DOCUMENT_REQUESTED",
              recipient: {
                userId: recipient.userId,
                email: recipient.email,
                role: "supplier",
                displayName: recipient.displayName,
              },
              entityRefs: {
                primaryId: app.id,
                supplierId: app.supplierId,
                supplierEmail: recipient.email,
                referenceUrl: "/dashboard/supplier/compliance",
                actionRequired: "Upload missing compliance documents and resubmit.",
              },
            });
          } catch (emailError) {
            console.error("Compliance submit email failed", emailError);
          }
        }
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to submit application" },
      { status }
    );
  }
}
