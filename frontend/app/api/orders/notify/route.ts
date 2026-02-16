import { NextResponse } from "next/server";
import { getSessionFromCookieHeader } from "../../../../lib/auth/sessionCookie";
import { sendEmail } from "../../../../lib/email/dispatchService";
import { resolveSupplierRecipient } from "../../../../lib/email/recipientResolvers";
import { getOrders } from "../../../../lib/store";
import { dispatchFreightAuditLifecycleHook } from "../../../../lib/freightAudit/FreightAuditLifecycleHooks";

export const runtime = "nodejs";

type NotifyOrderPayload = {
  orderId?: string;
  buyerEmail?: string;
  supplierIds?: string[];
  referenceUrl?: string;
  event?: "ORDER_CREATED" | "ORDER_CANCELLED" | "ORDER_COMPLETED";
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

  const payload = (await request.json()) as NotifyOrderPayload;
  const orderId = String(payload.orderId || "").trim();
  const buyerEmail = String(payload.buyerEmail || session?.email || "").trim();
  if (!orderId || !buyerEmail) {
    return NextResponse.json({ error: "orderId and buyerEmail required" }, { status: 400 });
  }

  const referenceUrl = payload.referenceUrl || `/dashboard/buyer/orders/${orderId}`;
  const supplierIds = Array.isArray(payload.supplierIds) ? payload.supplierIds : [];
  const event = payload.event || "ORDER_CREATED";
  const buyerActionRequired =
    event === "ORDER_CANCELLED"
      ? "No action required."
      : event === "ORDER_COMPLETED"
      ? "No action required."
      : "Review order details.";
  const orderRecord = getOrders().find((entry) => entry.orderId === orderId) || null;

  if (event === "ORDER_CREATED") {
    const actorId = session?.userId || session?.email || "orders-notify";
    dispatchFreightAuditLifecycleHook({
      source: "api.orders.notify",
      triggerEvent: "BOOKED",
      orderId,
      supplierId: supplierIds[0] || null,
      createdByRole: "system",
      createdById: actorId,
      closedByRole: "system",
      closedById: actorId,
      context: {
        source: "api.orders.notify",
        notificationEvent: event,
        orderId,
        buyerEmail,
        supplierIds,
        orderSnapshot: orderRecord
          ? {
              status: orderRecord.status,
              total: orderRecord.total,
              currency: orderRecord.currency || "aud",
              createdAt: orderRecord.createdAt,
              supplierIds: orderRecord.supplierIds || [],
            }
          : null,
      },
    });
  }

  try {
    await sendEmail({
      eventCode: event,
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
        referenceUrl,
        actionRequired: buyerActionRequired,
      },
      variables: {
        referenceId: orderId,
      },
    });
  } catch (error) {
    console.error("Order buyer email failed", error);
  }

  for (const supplierId of supplierIds) {
    const recipient = await resolveSupplierRecipient(supplierId);
    if (!recipient) continue;
    try {
      await sendEmail({
        eventCode: event,
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
          actionRequired:
            event === "ORDER_CREATED"
              ? "Review incoming order and confirm fulfilment."
              : "No action required.",
        },
        variables: {
          referenceId: orderId,
        },
      });
    } catch (error) {
      console.error("Order supplier email failed", error);
    }
  }

  return NextResponse.json({ ok: true });
}
