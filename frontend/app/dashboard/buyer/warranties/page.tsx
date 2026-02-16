"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import BuyerDashboardLayout from "../../../../components/BuyerDashboardLayout";
import { getSession, getWarrantyClaims } from "../../../../lib/store";
import Link from "next/link";
import { formatDate } from "../../../../lib/utils";

export default function BuyerWarrantiesPage() {
  const router = useRouter();
  const session = getSession();
  useEffect(() => {
    if (!session || session.role !== "buyer") {
      router.replace("/signin?role=buyer");
    }
  }, [router, session]);

  const claims = session?.email ? getWarrantyClaims().filter((c) => c.buyerEmail === session.email) : [];

  return (
    <BuyerDashboardLayout title="Warranties">
      <div className="flex justify-end">
        <Link href="/dashboard/buyer/orders" className="text-sm font-semibold text-brand-700">
          Start a warranty claim from an order
        </Link>
      </div>
      {claims.length === 0 ? (
        <p className="text-sm text-muted">No warranty claims yet.</p>
      ) : (
        <div className="space-y-3">
          {claims.map((c) => (
            <Link
              key={c.claimId}
              href={`/dashboard/buyer/warranties/${c.claimId}`}
              className="block bg-surface rounded-2xl shadow-card border p-4 hover:shadow-soft transition"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-sm text-muted">Claim ID</div>
                  <div className="text-base font-semibold">{c.claimId}</div>
                  <div className="text-sm text-muted">Order: {c.orderId}</div>
                  <div className="text-sm text-muted">Item: {c.productName}</div>
                </div>
                <div className="text-right space-y-1">
                  <div className="text-sm font-semibold">{c.status}</div>
                  <div className="text-sm text-muted">{formatDate(c.createdAt)}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </BuyerDashboardLayout>
  );
}
