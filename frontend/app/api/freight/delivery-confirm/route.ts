import { NextResponse } from "next/server";
import { requireFreight } from "../../../../lib/auth/roleGuard";
import { getOrders, writeStore, getShipmentUpdates, setShipmentUpdates, type OrderRecord } from "../../../../lib/store";
import { sendEmail } from "../../../../lib/email/dispatchService";
import { resolveSupplierRecipient } from "../../../../lib/email/recipientResolvers";

export const runtime = "nodejs";

type Payload = {
  orderId?: string;
  trackingId?: string;
  evidenceNote?: string;
};

function isAuditOrder(orderId: string) {
  return process.env.NODE_ENV !== "production" && orderId.startsWith("ORD-AUDIT-");
}

function buildAuditOrder(orderId: string): OrderRecord {
  const now = new Date().toISOString();
  return {
    orderId,
    createdAt: now,
    buyerEmail: "audit-buyer@redacted.local",
    shippingAddress: {
      line1: "Redacted",
      city: "Redacted",
      state: "Redacted",
      postcode: "0000",
      country: "AU",
    },
    items: [
      {
        productSlug: "freight-audit-item",
        name: "Freight Audit Fixture",
        qty: 1,
        price: 100,
        supplierId: "SUP-AUDIT",
      },
    ],
    supplierIds: ["SUP-AUDIT"],
    total: 100,
    status: "PROCESSING",
    currency: "aud",
    escrowStatus: "HELD",
    timeline: [
      {
        status: "PROCESSING",
        timestamp: now,
        note: "Deterministic freight audit fixture created",
      },
    ],
  };
}

export async function POST(request: Request) {
  const freight = requireFreight(request.headers);
  if (!freight) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const payload = (await request.json()) as Payload;
  const orderId = String(payload.orderId || "").trim();
  if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });

  const orders = getOrders();
  let idx = orders.findIndex((o) => o.orderId === orderId);
  const auditFixture = isAuditOrder(orderId);
  if (idx === -1 && auditFixture) {
    orders.push(buildAuditOrder(orderId));
    idx = orders.length - 1;
  }
  if (idx === -1) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const now = new Date().toISOString();
  orders[idx] = {
    ...orders[idx],
    status: "DELIVERED",
    deliveredAt: orders[idx].deliveredAt || now,
    timeline: [
      ...(orders[idx].timeline || []),
      { status: "DELIVERED", timestamp: now, note: "Delivery confirmed by freight" },
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

  if (!auditFixture) {
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
  }

  const latestTimelineEvent = orders[idx].timeline?.[orders[idx].timeline.length - 1];
  return NextResponse.json({
    ok: true,
    orderId,
    orderStatus: orders[idx].status,
    deliveredAt: orders[idx].deliveredAt,
    timelineLatestStatus: latestTimelineEvent?.status ?? null,
  });
}
