import { NextResponse } from "next/server";
import { getSessionFromCookieHeader } from "../../../../lib/auth/sessionCookie";
import { sendEmail } from "../../../../lib/email/dispatchService";
import { resolveSupplierRecipient } from "../../../../lib/email/recipientResolvers";

export const runtime = "nodejs";

type NotifyPaymentPayload = {
  orderId?: string;
  buyerEmail?: string;
  supplierIds?: string[];
  event?: "PAYMENT_CAPTURED" | "PAYMENT_FAILED";
};

function allowDev() {
  return process.env.NODE_ENV !== "production";
}

export async function POST(request: Request) {
  const session = getSessionFromCookieHeader(request.headers.get("cookie"));
  const dev = allowDev();
  if (!dev && (!session || session.role !== "buyer")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = (await request.json()) as NotifyPaymentPayload;
  const orderId = String(payload.orderId || "").trim();
  const buyerEmail = String(payload.buyerEmail || session?.email || "").trim();
  const event = payload.event || "PAYMENT_CAPTURED";
  if (!orderId || !buyerEmail) {
    return NextResponse.json({ error: "orderId and buyerEmail required" }, { status: 400 });
  }

  const buyerEvent = event === "PAYMENT_FAILED" ? "PAYMENT_FAILED" : "PAYMENT_CAPTURED";
  const actionRequired =
    buyerEvent === "PAYMENT_FAILED" ? "Please retry payment or contact support." : "No action required.";

  try {
    await sendEmail({
      eventCode: buyerEvent,
      recipient: {
        userId: session?.userId || buyerEmail,
        email: buyerEmail,
        role: "buyer",
        displayName: session?.email || buyerEmail,
      },
      entityRefs: {
        primaryId: orderId,
        orderId,
        buyerEmail,
        referenceUrl: `/dashboard/buyer/orders/${orderId}`,
        actionRequired,
      },
      variables: {
        referenceId: orderId,
      },
    });
  } catch (error) {
    console.error("Payment email failed", error);
  }

  if (buyerEvent === "PAYMENT_CAPTURED") {
    const supplierIds = Array.isArray(payload.supplierIds) ? payload.supplierIds : [];
    for (const supplierId of supplierIds) {
      const recipient = await resolveSupplierRecipient(supplierId);
      if (!recipient) continue;
      try {
        await sendEmail({
          eventCode: "PAYMENT_CAPTURED",
          recipient: {
            userId: recipient.userId,
            email: recipient.email,
            role: "supplier",
            displayName: recipient.displayName,
          },
          entityRefs: {
            primaryId: orderId,
            orderId,
            supplierId,
            supplierEmail: recipient.email,
            referenceUrl: "/dashboard/supplier/orders",
            actionRequired: "Prepare fulfilment.",
          },
          variables: {
            referenceId: orderId,
          },
        });
      } catch (error) {
        console.error("Payment captured supplier email failed", error);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
