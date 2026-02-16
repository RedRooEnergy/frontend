import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../lib/auth/adminGuard";
import { getOrders, writeStore, getShipmentUpdates, setShipmentUpdates } from "../../../../../lib/store";
import { sendEmail } from "../../../../../lib/email/dispatchService";
import { resolveSupplierRecipient } from "../../../../../lib/email/recipientResolvers";
import { dispatchFreightAuditLifecycleHook } from "../../../../../lib/freightAudit/FreightAuditLifecycleHooks";

export const runtime = "nodejs";

type Payload = {
  orderId?: string;
  trackingId?: string;
  evidenceNote?: string;
};

export async function POST(request: Request) {
  const admin = requireAdmin(request.headers);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const payload = (await request.json()) as Payload;
  const orderId = String(payload.orderId || "").trim();
  if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });

  const orders = getOrders();
  const idx = orders.findIndex((o) => o.orderId === orderId);
  if (idx === -1) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const now = new Date().toISOString();
  orders[idx] = {
    ...orders[idx],
    status: "DELIVERED",
    deliveredAt: orders[idx].deliveredAt || now,
    timeline: [
      ...(orders[idx].timeline || []),
      { status: "DELIVERED", timestamp: now, note: "Delivery confirmed by admin" },
    ],
  };
  writeStore("orders" as any, orders as any);

  const existingUpdates = getShipmentUpdates();
  const nextUpdates = [...existingUpdates];
  orders[idx].items.forEach((item) => {
    nextUpdates.push({
      id: crypto.randomUUID(),
      supplierId: item.supplierId || "supplier-unknown",
      productSlug: item.productSlug,
      milestone: "DELIVERED",
      trackingId: payload.trackingId,
      evidenceNote: payload.evidenceNote,
      timestamp: now,
    });
  });
  setShipmentUpdates(nextUpdates);

  const primarySupplierId = orders[idx].items.find((item) => !!item.supplierId)?.supplierId || null;
  dispatchFreightAuditLifecycleHook({
    source: "api.admin.freight.delivery-confirm",
    triggerEvent: "DELIVERED",
    orderId,
    shipmentId: payload.trackingId || null,
    supplierId: primarySupplierId,
    createdByRole: "admin",
    createdById: admin.actorId,
    closedByRole: "admin",
    closedById: admin.actorId,
    context: {
      source: "api.admin.freight.delivery-confirm",
      orderId,
      trackingId: payload.trackingId || null,
      evidenceNote: payload.evidenceNote || null,
      availableEvidenceCodes: payload.trackingId
        ? ["PROOF_OF_DELIVERY_REFERENCE", "DELIVERY_ATTEMPT_LOG"]
        : ["DELIVERY_ATTEMPT_LOG"],
    },
  });

  // Notify buyer (delivery confirmed)
  try {
    await sendEmail({
      eventCode: "DELIVERY_CONFIRMED",
      recipient: {
        userId: orders[idx].buyerEmail,
        email: orders[idx].buyerEmail,
        role: "buyer",
        displayName: orders[idx].buyerEmail,
      },
      entityRefs: {
        primaryId: orderId,
        orderId,
        buyerEmail: orders[idx].buyerEmail,
        referenceUrl: `/dashboard/buyer/orders/${orderId}`,
        actionRequired: "No action required.",
      },
      variables: {
        referenceId: orderId,
      },
    });
  } catch (error) {
    console.error("Delivery confirmed buyer email failed", error);
  }

  // Notify suppliers (delivery confirmed)
  const supplierIds = Array.from(
    new Set(orders[idx].items.map((item) => item.supplierId).filter(Boolean) as string[])
  );
  for (const supplierId of supplierIds) {
    const recipient = await resolveSupplierRecipient(supplierId);
    if (!recipient) continue;
    try {
      await sendEmail({
        eventCode: "DELIVERY_CONFIRMED",
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
          actionRequired: "No action required.",
        },
        variables: {
          referenceId: orderId,
        },
      });
    } catch (error) {
      console.error("Delivery confirmed supplier email failed", error);
    }
  }

  return NextResponse.json({ ok: true });
}
