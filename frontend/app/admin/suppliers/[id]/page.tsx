"use client";

import { useEffect, useState } from "react";
import { getAdminAuthHeaders } from "../../../../lib/auth/clientAdminHeaders";
import ImmutableTimeline from "../_components/ImmutableTimeline";
import SupplierDocsPanel from "../_components/SupplierDocsPanel";
import SupplierProfilePanel from "../_components/SupplierProfilePanel";

export default function AdminSupplierDetailPage({ params }: { params: { id: string } }) {
  const [backendAvailable, setBackendAvailable] = useState(false);

  useEffect(() => {
    let active = true;

    async function probe() {
      try {
        const response = await fetch(`/api/admin/dashboard/suppliers/${encodeURIComponent(params.id)}`, {
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
        <h2 className="text-xl font-semibold text-slate-900">Supplier Detail</h2>
        <p className="text-sm text-slate-600">Supplier moderation actions are intentionally hidden in B3.</p>
      </header>
      <SupplierProfilePanel supplierId={params.id} />
      <SupplierDocsPanel backendAvailable={backendAvailable} />
      <ImmutableTimeline title="Supplier immutable timeline" />
    </div>
  );
}
