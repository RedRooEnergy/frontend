"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminDashboardLayout from "../../../../components/AdminDashboardLayout";
import {
  getSupplierProductStates,
  getSession,
  updateSupplierProductState,
  SupplierProductState,
  getSupplierProductRecords,
} from "../../../../lib/store";

export default function AdminCatalogueGovernancePage() {
  const router = useRouter();
  const session = getSession();
  useEffect(() => {
    if (!session || session.role !== "admin") {
      router.replace("/signin?role=admin");
    }
  }, [router, session]);
  const [states, setStates] = useState(() => getSupplierProductStates());

  const updateState = async (record: SupplierProductState, state: SupplierProductState["state"]) => {
    updateSupplierProductState(record.productSlug, record.supplierId, { state });
    setStates(getSupplierProductStates());
    fetch("/api/admin/catalogue/product-state-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplierId: record.supplierId,
        productSlug: record.productSlug,
        state,
      }),
    }).catch((err) => console.error("Product state email notify failed", err));
    if (state === "APPROVED") {
      const productRecords = getSupplierProductRecords();
      const match = productRecords.find(
        (r) =>
          r.id === record.productSlug ||
          r.name === record.productSlug ||
          r.name?.toLowerCase().replace(/[^a-z0-9]+/g, "-") === record.productSlug
      );
      if (!match) {
        console.warn("No supplier product record found for approval fee event");
        return;
      }
      if (!match.certificationFeeBase || !match.certificationFeeCurrency) {
        console.warn("Certification fee base missing; skipping partner fee event");
        return;
      }
      const servicePartnerId = match.certifierOfRecord || match.compliancePartnerId;
      if (!servicePartnerId) {
        console.warn("Certifier of record missing; skipping partner fee event");
        return;
      }
      try {
        await fetch("/api/internal/fee-engine", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            triggerEvent: "PRODUCT_APPROVED",
            productId: record.productSlug,
            servicePartnerId,
            certificationFeeBase: match.certificationFeeBase,
            currency: match.certificationFeeCurrency || "AUD",
          }),
        });
      } catch (e) {
        console.error("Failed to emit partner listing approval fee", e);
      }
    }
  };

  return (
    <AdminDashboardLayout title="Grand-Master Product & Catalogue Governance">
      <div className="buyer-card">
        <div className="buyer-card-header">
          <div>
            <div className="buyer-section-title">Product approvals</div>
            <p className="text-sm text-muted">Approve products, pricing rules, and visibility.</p>
          </div>
        </div>
        {states.length === 0 ? (
          <p className="text-sm text-muted">No product submissions yet.</p>
        ) : (
          <div className="buyer-table">
            <div className="buyer-table-header">
              <span>Product</span>
              <span>Supplier</span>
              <span>State</span>
              <span>Certifications</span>
              <span>Pricing snapshot</span>
              <span>Actions</span>
              <span></span>
              <span></span>
            </div>
            {states.map((record) => (
              <div key={`${record.productSlug}-${record.supplierId}`} className="buyer-table-row">
                <span className="text-sm font-semibold">{record.productSlug}</span>
                <span>{record.supplierId}</span>
                <span className="buyer-pill">{record.state}</span>
                <span>{record.certificationsProvided ? "Yes" : "No"}</span>
                <span>{record.pricingSnapshotCaptured ? "Captured" : "Pending"}</span>
                <span>
                  <button
                    className="text-sm font-semibold text-brand-700"
                    onClick={() => updateState(record, "APPROVED")}
                  >
                    Approve
                  </button>
                </span>
                <span>
                  <button
                    className="text-sm font-semibold text-amber-700"
                    onClick={() => updateState(record, "REVIEW")}
                  >
                    Review
                  </button>
                </span>
                <span>
                  <button
                    className="text-sm font-semibold text-red-600"
                    onClick={() => updateState(record, "RETURN_WINDOW")}
                  >
                    Hold
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminDashboardLayout>
  );
}
