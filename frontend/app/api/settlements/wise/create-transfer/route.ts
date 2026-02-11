import { NextResponse } from "next/server";
import crypto from "crypto";
import { getOrders, writeStore, getAdminFlags, type OrderRecord } from "../../../../../lib/store";
import { canSettle, markSettlementInitiated, markSettled } from "../../../../../lib/escrow";
import { recordAudit } from "../../../../../lib/audit";
import { requireAdmin } from "../../../../../lib/auth/adminGuard";

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
  const admin = requireAdmin(request.headers);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as { orderId?: string };
  const orderId = String(payload.orderId || "").trim();
  if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });

  const orders = getOrders();
  let idx = orders.findIndex((o) => o.orderId === orderId);
  if (idx === -1 && isAuditOrder(orderId)) {
    orders.push(buildAuditOrder(orderId));
    idx = orders.length - 1;
    writeStore("orders" as any, orders as any);
  }
  if (idx === -1) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const adminFlags = getAdminFlags();
  const order = orders[idx];
  if (!canSettle(order, adminFlags.settlementOverride === true) || order.escrowStatus !== "HELD") {
    return NextResponse.json({ error: "Not eligible for settlement" }, { status: 400 });
  }

  orders[idx] = markSettlementInitiated(order);
  writeStore("orders" as any, orders as any);
  recordAudit("ADMIN_SETTLEMENT_INITIATED", { orderId });

  const apiKey = process.env.WISE_SANDBOX_API_KEY;
  const profileId = process.env.WISE_SANDBOX_PROFILE_ID;
  const useDeterministicSandbox = process.env.NODE_ENV !== "production" && (!apiKey || !profileId);
  if (useDeterministicSandbox) {
    const transferId = `sandbox-${orderId.toLowerCase()}`;
    orders[idx] = markSettled(orders[idx], transferId);
    writeStore("orders" as any, orders as any);
    recordAudit("ADMIN_SETTLEMENT_COMPLETED", { orderId, transferId });
    const latestTimelineEvent = orders[idx].timeline?.[orders[idx].timeline.length - 1];
    return NextResponse.json({
      ok: true,
      transferId,
      settlementMode: "deterministic-sandbox",
      orderId,
      orderStatus: orders[idx].status,
      escrowStatus: orders[idx].escrowStatus,
      timelineLatestStatus: latestTimelineEvent?.status ?? null,
    });
  }

  if (!apiKey || !profileId) {
    return NextResponse.json({ error: "Wise sandbox not configured" }, { status: 500 });
  }

  try {
    const transferRes = await fetch("https://api.sandbox.transferwise.tech/v1/transfers", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-idempotence-uuid": crypto.randomUUID(),
      },
      body: JSON.stringify({
        targetAccount: "sandbox-recipient",
        quoteUuid: "sandbox-quote",
        customerTransactionId: order.orderId,
        details: { reference: `Order ${order.orderId}` },
      }),
    });

    if (!transferRes.ok) {
      const err = await transferRes.text();
      console.error("Wise transfer error", err);
      return NextResponse.json({ error: "Wise transfer failed" }, { status: 502 });
    }

    const transfer = (await transferRes.json()) as { id?: string };
    orders[idx] = markSettled(orders[idx], transfer.id);
    writeStore("orders" as any, orders as any);
    recordAudit("ADMIN_SETTLEMENT_COMPLETED", { orderId, transferId: transfer.id });
    const latestTimelineEvent = orders[idx].timeline?.[orders[idx].timeline.length - 1];
    return NextResponse.json({
      ok: true,
      transferId: transfer.id,
      settlementMode: "wise-sandbox",
      orderId,
      orderStatus: orders[idx].status,
      escrowStatus: orders[idx].escrowStatus,
      timelineLatestStatus: latestTimelineEvent?.status ?? null,
    });
  } catch (e: any) {
    console.error("Wise transfer exception", e);
    return NextResponse.json({ error: e?.message || "Wise error" }, { status: 500 });
  }
}
