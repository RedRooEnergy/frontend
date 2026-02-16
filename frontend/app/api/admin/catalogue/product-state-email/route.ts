import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../lib/auth/adminGuard";
import { sendEmail } from "../../../../../lib/email/dispatchService";
import { resolveSupplierRecipient } from "../../../../../lib/email/recipientResolvers";

export const runtime = "nodejs";

type Payload = {
  supplierId?: string;
  productSlug?: string;
  state?: "APPROVED" | "REVIEW" | "RETURN_WINDOW";
};

function mapState(state?: string) {
  if (state === "APPROVED") return "PRODUCT_APPROVED";
  if (state === "REVIEW") return "PRODUCT_SUBMITTED_FOR_REVIEW";
  if (state === "RETURN_WINDOW") return "PRODUCT_SUSPENDED";
  return null;
}

export async function POST(request: Request) {
  const admin = requireAdmin(request.headers);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const payload = (await request.json()) as Payload;
  const supplierId = String(payload.supplierId || "").trim();
  const productSlug = String(payload.productSlug || "").trim();
  const eventCode = mapState(payload.state);
  if (!supplierId || !productSlug || !eventCode) {
    return NextResponse.json({ error: "supplierId, productSlug, state required" }, { status: 400 });
  }

  const recipient = await resolveSupplierRecipient(supplierId);
  if (!recipient) {
    return NextResponse.json({ ok: false, error: "Supplier recipient not found" }, { status: 404 });
  }

  const actionRequired =
    eventCode === "PRODUCT_APPROVED"
      ? "No action required."
      : eventCode === "PRODUCT_SUBMITTED_FOR_REVIEW"
      ? "Await review outcome."
      : "Review the hold reason and update your submission.";

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
        primaryId: productSlug,
        productId: productSlug,
        supplierId,
        supplierEmail: recipient.email,
        referenceUrl: `/dashboard/supplier/products/${productSlug}`,
        actionRequired,
      },
      variables: {
        referenceId: productSlug,
      },
    });
  } catch (error) {
    console.error("Product state email failed", error);
  }

  return NextResponse.json({ ok: true });
}
