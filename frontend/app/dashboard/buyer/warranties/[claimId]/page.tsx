"use client";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import BuyerDashboardLayout from "../../../../../components/BuyerDashboardLayout";
import { getSession, getWarrantyClaims, WarrantyStatus } from "../../../../../lib/store";
import { formatDate } from "../../../../../lib/utils";
import { recordAudit } from "../../../../../lib/audit";

const statusLabels: Record<WarrantyStatus, string> = {
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  INFO_REQUIRED: "Info required",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  RESOLVED: "Resolved",
};

export default function WarrantyDetailPage({ params }: { params: { claimId: string } }) {
  const router = useRouter();
  const session = getSession();

  useEffect(() => {
    if (!session || session.role !== "buyer") {
      router.replace("/signin?role=buyer");
    } else {
      recordAudit("BUYER_VIEW_WARRANTY", { claimId: params.claimId });
    }
  }, [router, session, params.claimId]);

  const claim = useMemo(() => {
    if (!session?.email) return undefined;
    return getWarrantyClaims().find((c) => c.claimId === params.claimId && c.buyerEmail === session.email);
  }, [params.claimId, session?.email]);

  if (!claim) {
    return (
      <BuyerDashboardLayout title="Warranty claim not found">
        <p className="text-sm text-muted">No warranty claim matches this ID.</p>
      </BuyerDashboardLayout>
    );
  }

  return (
    <BuyerDashboardLayout title={`Warranty ${claim.claimId}`}>
      <div className="space-y-4">
        <div className="bg-surface rounded-2xl shadow-card border p-4 space-y-2">
          <div className="text-sm text-muted">Order</div>
          <div className="text-base font-semibold">{claim.orderId}</div>
          <div className="text-sm text-muted">Item</div>
          <div className="text-base font-semibold">{claim.productName}</div>
          <div className="text-sm text-muted">Status</div>
          <div className="text-base font-semibold">{statusLabels[claim.status]}</div>
          <div className="text-sm text-muted">Issue</div>
          <div className="text-sm">{claim.issue}</div>
          {claim.installerReference && (
            <>
              <div className="text-sm text-muted">Installer reference</div>
              <div className="text-sm">{claim.installerReference}</div>
            </>
          )}
          {claim.installDate && (
            <>
              <div className="text-sm text-muted">Install date</div>
              <div className="text-sm">{formatDate(claim.installDate)}</div>
            </>
          )}
          <p className="text-xs text-muted">
            Responsibility overview: Manufacturer (product), Installer (workmanship), Supplier (evidence and listings).
            Statuses are informational only.
          </p>
        </div>

        <div className="bg-surface rounded-2xl shadow-card border p-4 space-y-2">
          <h2 className="text-lg font-semibold">Timeline</h2>
          <div className="flex flex-col gap-2">
            {claim.timeline.map((t) => (
              <div key={t.timestamp} className="flex items-center justify-between text-sm">
                <span className="font-semibold">{statusLabels[t.status]}</span>
                <span className="text-muted">{formatDate(t.timestamp)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </BuyerDashboardLayout>
  );
}
