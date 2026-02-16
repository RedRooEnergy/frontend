"use client";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import BuyerDashboardLayout from "../../../../../components/BuyerDashboardLayout";
import { getReturns, getSession } from "../../../../../lib/store";
import { recordAudit } from "../../../../../lib/audit";
import { formatDate } from "../../../../../lib/utils";

const statusLabels: Record<string, string> = {
  REQUESTED: "Requested",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  IN_TRANSIT: "In transit",
  REFUNDED: "Refunded",
};

export default function ReturnDetailPage({ params }: { params: { rmaId: string } }) {
  const router = useRouter();
  const session = getSession();

  useEffect(() => {
    if (!session || session.role !== "buyer") {
      router.replace("/signin?role=buyer");
    } else {
      recordAudit("BUYER_VIEW_RETURN", { rmaId: params.rmaId });
    }
  }, [router, session, params.rmaId]);

  const ret = useMemo(() => {
    if (!session?.email) return undefined;
    return getReturns().find((r) => r.rmaId === params.rmaId && r.buyerEmail === session.email);
  }, [params.rmaId, session?.email]);

  if (!ret) {
    return (
      <BuyerDashboardLayout title="Return not found">
        <p className="text-sm text-muted">No return matches this ID.</p>
      </BuyerDashboardLayout>
    );
  }

  return (
    <BuyerDashboardLayout title={`Return ${ret.rmaId}`}>
      <div className="space-y-4">
        <div className="bg-surface rounded-2xl shadow-card border p-4 space-y-2">
          <div className="text-sm text-muted">Order ID</div>
          <div className="text-base font-semibold">{ret.orderId}</div>
          <div className="text-sm text-muted">Item</div>
          <div className="text-base font-semibold">{ret.productName}</div>
          <div className="text-sm text-muted">Status</div>
          <div className="text-base font-semibold">{statusLabels[ret.status] || ret.status}</div>
          <div className="text-sm text-muted">Reason</div>
          <div className="text-sm">{ret.reason}</div>
        </div>

        <div className="bg-surface rounded-2xl shadow-card border p-4 space-y-2">
          <h2 className="text-lg font-semibold">Timeline</h2>
          <div className="flex flex-col gap-2">
            {ret.timeline.map((t) => (
              <div key={t.timestamp} className="flex items-center justify-between text-sm">
                <span className="font-semibold">{statusLabels[t.status] || t.status}</span>
                <span className="text-muted">{formatDate(t.timestamp)}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted">Refunds, if approved, will be processed to the original payment method.</p>
        </div>
      </div>
    </BuyerDashboardLayout>
  );
}
