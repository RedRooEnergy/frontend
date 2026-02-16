"use client";
export const dynamic = "force-dynamic";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BuyerDashboardLayout from "../../../../../components/BuyerDashboardLayout";
import { getOrders, getSession, addWarrantyClaim, getWarrantyClaims } from "../../../../../lib/store";
import { recordAudit } from "../../../../../lib/audit";
import { formatDate } from "../../../../../lib/utils";

function InnerForm() {
  const router = useRouter();
  const params = useSearchParams();
  const orderId = params.get("orderId") || "";
  const productSlug = params.get("productSlug") || "";
  const session = getSession();

  const [issue, setIssue] = useState("");
  const [installerRef, setInstallerRef] = useState("");
  const [installDate, setInstallDate] = useState("");
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

  const existing = useMemo(() => {
    if (!session?.email) return undefined;
    return getWarrantyClaims().find(
      (w) => w.orderId === orderId && w.productSlug === productSlug && w.buyerEmail === session.email
    );
  }, [orderId, productSlug, session?.email]);

  const handleSubmit = () => {
    if (!order || !lineItem) return;
    if (existing) {
      setError("A warranty claim already exists for this item.");
      return;
    }
    if (!issue.trim()) {
      setError("Issue description is required.");
      return;
    }
    const now = new Date().toISOString();
    addWarrantyClaim({
      claimId: crypto.randomUUID(),
      orderId: order.orderId,
      buyerEmail: order.buyerEmail,
      productSlug: lineItem.productSlug,
      productName: lineItem.name,
      issue,
      installerReference: installerRef || undefined,
      installDate: installDate || undefined,
      status: "SUBMITTED",
      createdAt: now,
      updatedAt: now,
      timeline: [{ status: "SUBMITTED", timestamp: now }],
    });
    recordAudit("BUYER_WARRANTY_SUBMITTED", { orderId: order.orderId, productSlug: lineItem.productSlug });
    router.replace("/dashboard/buyer/warranties");
  };

  return (
    <BuyerDashboardLayout title="Submit a Warranty Claim">
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
              Delivered: {order.deliveredAt ? formatDate(order.deliveredAt) : "Not recorded"}
            </div>
          </div>

          <div className="bg-surface rounded-2xl shadow-card border p-4 space-y-3">
            <label className="text-sm font-medium" htmlFor="issue">
              Describe the issue
            </label>
            <textarea
              id="issue"
              className="w-full border rounded-md px-3 py-2"
              value={issue}
              onChange={(e) => setIssue(e.target.value)}
              required
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="installerRef">
                  Installer reference (optional)
                </label>
                <input
                  id="installerRef"
                  className="w-full border rounded-md px-3 py-2"
                  value={installerRef}
                  onChange={(e) => setInstallerRef(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="installDate">
                  Install date (optional)
                </label>
                <input
                  id="installDate"
                  type="date"
                  className="w-full border rounded-md px-3 py-2"
                  value={installDate}
                  onChange={(e) => setInstallDate(e.target.value)}
                />
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <p className="text-xs text-muted">
              Responsibility overview: Manufacturer (product), Installer (workmanship), Supplier (evidence and listings).
            </p>
            <div className="flex justify-end">
              <button className="px-4 py-2 bg-brand-700 text-brand-100 rounded-md font-semibold" onClick={handleSubmit}>
                Submit claim
              </button>
            </div>
          </div>
        </div>
      )}
    </BuyerDashboardLayout>
  );
}

export default function NewWarrantyPage() {
  return (
    <Suspense
      fallback={
        <BuyerDashboardLayout title="Submit a Warranty Claim">
          <p className="text-sm text-muted">Loading…</p>
        </BuyerDashboardLayout>
      }
    >
      <InnerForm />
    </Suspense>
  );
}
