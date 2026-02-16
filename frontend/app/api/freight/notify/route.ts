import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/auth/adminGuard";
import { sendEmail } from "../../../../lib/email/dispatchService";
import { resolveSupplierRecipient } from "../../../../lib/email/recipientResolvers";
import { dispatchFreightAuditLifecycleHook } from "../../../../lib/freightAudit/FreightAuditLifecycleHooks";
import type { FreightAuditTriggerEvent } from "../../../../lib/freightAudit/FreightAuditRules";

export const runtime = "nodejs";

type NotifyPayload = {
  supplierId?: string;
  productSlug?: string;
  milestone?: "PICKUP" | "EXPORT_CLEARANCE" | "IN_TRANSIT" | "DELIVERED";
  trackingId?: string;
  buyerEmail?: string;
  orderId?: string;
};

function mapMilestone(milestone: string | undefined) {
  if (milestone === "PICKUP") return "FREIGHT_BOOKED";
  if (milestone === "IN_TRANSIT" || milestone === "EXPORT_CLEARANCE") return "FREIGHT_IN_TRANSIT";
  if (milestone === "DELIVERED") return "DELIVERY_CONFIRMED";
  return null;
}

function mapMilestoneToAuditTrigger(milestone: string | undefined): FreightAuditTriggerEvent | null {
  if (milestone === "PICKUP" || milestone === "IN_TRANSIT") return "DISPATCHED";
  if (milestone === "EXPORT_CLEARANCE") return "CUSTOMS_CLEARED";
  if (milestone === "DELIVERED") return "DELIVERED";
  return null;
}

export async function POST(request: Request) {
  const admin = requireAdmin(request.headers);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const payload = (await request.json()) as NotifyPayload;
  const supplierId = String(payload.supplierId || "").trim();
  const productSlug = String(payload.productSlug || "").trim();
  const eventCode = mapMilestone(payload.milestone);
  const auditTriggerEvent = mapMilestoneToAuditTrigger(payload.milestone);
  if (!supplierId || !productSlug || !eventCode) {
    return NextResponse.json({ error: "supplierId, productSlug, milestone required" }, { status: 400 });
  }

  if (auditTriggerEvent) {
    dispatchFreightAuditLifecycleHook({
      source: "api.freight.notify",
      triggerEvent: auditTriggerEvent,
      orderId: payload.orderId || null,
      shipmentId: payload.trackingId || `${supplierId}:${productSlug}`,
      supplierId,
      createdByRole: "admin",
      createdById: admin.actorId,
      closedByRole: "admin",
      closedById: admin.actorId,
      context: {
        source: "api.freight.notify",
        supplierId,
        productSlug,
        milestone: payload.milestone || null,
        trackingId: payload.trackingId || null,
        orderId: payload.orderId || null,
        buyerEmail: payload.buyerEmail || null,
      },
    });
  }

  const supplierRecipient = await resolveSupplierRecipient(supplierId);
  if (supplierRecipient) {
    try {
      await sendEmail({
        eventCode,
        recipient: {
          userId: supplierRecipient.userId,
          email: supplierRecipient.email,
          role: "supplier",
          displayName: supplierRecipient.displayName,
        },
        entityRefs: {
          primaryId: `${productSlug}:${payload.milestone}`,
          supplierId,
          supplierEmail: supplierRecipient.email,
          referenceUrl: "/dashboard/supplier/shipments",
          actionRequired: "No action required.",
        },
        variables: {
          referenceId: productSlug,
        },
      });
    } catch (error) {
      console.error("Freight email failed", error);
    }
  }

  if (payload.buyerEmail) {
    const buyerEvent = eventCode === "DELIVERY_CONFIRMED" ? "ORDER_COMPLETED" : eventCode;
    try {
      await sendEmail({
        eventCode: buyerEvent,
        recipient: {
          userId: payload.buyerEmail,
          email: payload.buyerEmail,
          role: "buyer",
          displayName: payload.buyerEmail,
        },
        entityRefs: {
          primaryId: payload.orderId || productSlug,
          orderId: payload.orderId || "",
          buyerEmail: payload.buyerEmail,
          referenceUrl: payload.orderId ? `/dashboard/buyer/orders/${payload.orderId}` : "/dashboard/buyer/orders",
          actionRequired: "No action required.",
        },
        variables: {
          referenceId: payload.orderId || productSlug,
        },
      });
    } catch (error) {
      console.error("Freight buyer email failed", error);
    }
  }

  return NextResponse.json({ ok: true });
}
