"use client";

import { useEffect, useState } from "react";
import { getAdminAuthHeaders } from "../../../lib/auth/clientAdminHeaders";
import SupplierTable from "./_components/SupplierTable";

type SupplierRow = {
  supplierId: string;
  name: string;
  status: string;
  tier: string;
  risk: string;
};

export default function AdminSuppliersPage() {
  const [loading, setLoading] = useState(true);
  const [backendAvailable, setBackendAvailable] = useState(false);
  const [rows, setRows] = useState<SupplierRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/admin/dashboard/suppliers", {
          method: "GET",
          headers: getAdminAuthHeaders(),
          cache: "no-store",
        });
        if (!active) return;

        if (!response.ok) {
          setBackendAvailable(false);
          setRows([]);
          return;
        }

        const payload = (await response.json().catch(() => ({}))) as { items?: SupplierRow[] };
        setBackendAvailable(true);
        setRows(Array.isArray(payload.items) ? payload.items : []);
      } catch (requestError: any) {
        if (!active) return;
        setBackendAvailable(false);
        setRows([]);
        setError(String(requestError?.message || requestError));
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-xl font-semibold text-slate-900">Suppliers</h2>
        <p className="text-sm text-slate-600">Moderation UI remains read-only until backend supplier moderation endpoints are available.</p>
      </header>

      {loading ? <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading supplier surface...</div> : null}
      {!loading && !backendAvailable ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">NOT AVAILABLE (backend not wired)</div>
      ) : null}
      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}
      {!loading && backendAvailable ? <SupplierTable rows={rows} /> : null}
    </div>
  );
}
