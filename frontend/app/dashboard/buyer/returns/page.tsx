"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import BuyerDashboardLayout from "../../../../components/BuyerDashboardLayout";
import { getReturns, getSession } from "../../../../lib/store";
import Link from "next/link";
import { formatDate } from "../../../../lib/utils";

export default function BuyerReturnsPage() {
  const router = useRouter();
  const session = getSession();
  useEffect(() => {
    if (!session || session.role !== "buyer") {
      router.replace("/signin?role=buyer");
    }
  }, [router, session]);

  const returns = session?.email ? getReturns().filter((r) => r.buyerEmail === session.email) : [];

  return (
    <BuyerDashboardLayout title="Returns & Refunds">
      <div className="buyer-card">
        <div className="buyer-card-header">
          <div className="buyer-section-title">Return requests</div>
          <Link href="/dashboard/buyer/orders" className="text-sm font-semibold text-brand-700">
            Start a return from an order
          </Link>
        </div>
        {returns.length === 0 ? (
          <p className="text-sm text-muted">No return requests yet.</p>
        ) : (
          <div className="space-y-3">
            {returns.map((ret) => (
              <Link
                key={ret.rmaId}
                href={`/dashboard/buyer/returns/${ret.rmaId}`}
                className="block buyer-card hover:shadow-soft transition"
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-sm text-muted">Return ID</div>
                    <div className="text-base font-semibold">{ret.rmaId}</div>
                    <div className="text-sm text-muted">Order: {ret.orderId}</div>
                    <div className="text-sm text-muted">Item: {ret.productName}</div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="buyer-pill">{ret.status}</div>
                    <div className="text-sm text-muted">{formatDate(ret.createdAt)}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </BuyerDashboardLayout>
  );
}
