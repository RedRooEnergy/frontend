"use client";

import { useEffect, useState } from "react";
import { getAdminAuthHeaders } from "../../../../lib/auth/clientAdminHeaders";
import ComplianceSummary from "../_components/ComplianceSummary";
import PricingRmbAudPanel from "../_components/PricingRmbAudPanel";
import ProductDetailPanel from "../_components/ProductDetailPanel";

export default function AdminProductDetailPage({ params }: { params: { id: string } }) {
  const [backendAvailable, setBackendAvailable] = useState(false);

  useEffect(() => {
    let active = true;

    async function probe() {
      try {
        const response = await fetch(`/api/admin/dashboard/products/${encodeURIComponent(params.id)}`, {
          method: "GET",
          headers: getAdminAuthHeaders(),
          cache: "no-store",
        });
        if (!active) return;
        setBackendAvailable(response.ok);
      } catch {
        if (!active) return;
        setBackendAvailable(false);
      }
    }

    probe();
    return () => {
      active = false;
    };
  }, [params.id]);

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-xl font-semibold text-slate-900">Product Detail</h2>
        <p className="text-sm text-slate-600">Read-only display in B3. No moderation actions are available.</p>
      </header>
      <ProductDetailPanel productId={params.id} backendAvailable={backendAvailable} />
      <ComplianceSummary backendAvailable={backendAvailable} />
      <PricingRmbAudPanel backendAvailable={backendAvailable} />
    </div>
  );
}
