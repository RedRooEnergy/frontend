"use client";
"use client";
export const dynamic = "force-dynamic";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BuyerDashboardLayout from "../../../../../components/BuyerDashboardLayout";
import { getOrders, getReturns, getSession, addReturnRequest } from "../../../../../lib/store";
import { recordAudit } from "../../../../../lib/audit";
import { formatDate } from "../../../../../lib/utils";

const DAY_MS = 24 * 60 * 60 * 1000;

function InnerForm() {
  const router = useRouter();
  const params = useSearchParams();
  const orderId = params.get("orderId") || "";
  const productSlug = params.get("productSlug") || "";
  const session = getSession();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session || session.role !== "buyer") {
      router.replace("/signin?role=buyer");
    }
  }, [router, session]);

  const order = useMemo(() => {
    if (!session?.email) return undefined;
    return getOrders().find((o) => o.orderId === orderId && o.buyerEmail === session.email);
  }, [orderId, session?.email]);

  const lineItem = order?.items.find((i) => i.productSlug === productSlug);

  const deliveredDate = useMemo(() => {
    if (order?.timeline) {
      const delivered = order.timeline.find((e) => e.status === "DELIVERED");
      if (delivered) return new Date(delivered.timestamp);
    }
    if (order?.deliveredAt) return new Date(order.deliveredAt);
    return null;
  }, [order]);

  const eligible = useMemo(() => {
    if (!order || !lineItem || order.status !== "DELIVERED" || !deliveredDate) return false;
    const now = new Date();
    return now.getTime() - deliveredDate.getTime() <= 30 * DAY_MS;
  }, [order, lineItem, deliveredDate]);

  const existingReturn = useMemo(() => {
    if (!session?.email) return undefined;
    return getReturns().find((r) => r.orderId === orderId && r.productSlug === productSlug && r.buyerEmail === session.email);
  }, [orderId, productSlug, session?.email]);

  const handleSubmit = () => {
    if (!order || !lineItem) return;
    if (!eligible) {
      setError("Return window has expired or item not delivered.");
      return;
    }
    if (existingReturn) {
      setError("A return is already active for this item.");
      return;
    }
    if (!reason.trim()) {
      setError("Reason is required.");
      return;
    }
    const now = new Date().toISOString();
    addReturnRequest({
      rmaId: crypto.randomUUID(),
      orderId: order.orderId,
      buyerEmail: order.buyerEmail,
      productSlug: lineItem.productSlug,
      productName: lineItem.name,
      reason,
      status: "REQUESTED",
      createdAt: now,
      updatedAt: now,
      timeline: [{ status: "REQUESTED", timestamp: now }],
    });
    recordAudit("BUYER_RETURN_REQUESTED", { orderId: order.orderId, productSlug: lineItem.productSlug });
    router.replace("/dashboard/buyer/returns");
  };

  return (
    <BuyerDashboardLayout title="Request a Return">
      {!order || !lineItem ? (
        <p className="text-sm text-muted">Order or item not found.</p>
      ) : (
        <div className="space-y-4">
          <div className="bg-surface rounded-2xl shadow-card border p-4 space-y-2">
            <div className="text-sm text-muted">Order</div>
            <div className="text-base font-semibold">{order.orderId}</div>
            <div className="text-sm text-muted">Item</div>
            <div className="text-base font-semibold">{lineItem.name}</div>
            <div className="text-sm text-muted">
              Delivered: {deliveredDate ? formatDate(deliveredDate) : "Not recorded"}
            </div>
            <div className="text-sm text-muted">
              Return window: {eligible ? "Eligible (within 30 days)" : "Not eligible"}
            </div>
          </div>
          <div className="bg-surface rounded-2xl shadow-card border p-4 space-y-3">
            <label className="text-sm font-medium" htmlFor="reason">
              Reason for return
            </label>
            <textarea
              id="reason"
              className="w-full border rounded-md px-3 py-2"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end">
              <button
                className="px-4 py-2 bg-brand-700 text-brand-100 rounded-md font-semibold"
                onClick={handleSubmit}
                disabled={!eligible}
              >
                Submit return
              </button>
            </div>
          </div>
        </div>
      )}
    </BuyerDashboardLayout>
  );
}

export default function NewReturnPage() {
  return (
    <Suspense fallback={<BuyerDashboardLayout title="Request a Return"><p className="text-sm text-muted">Loading…</p></BuyerDashboardLayout>}>
      <InnerForm />
    </Suspense>
  );
}
