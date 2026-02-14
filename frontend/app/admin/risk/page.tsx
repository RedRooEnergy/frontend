"use client";

import { useEffect, useState } from "react";
import { listFinancialHolds } from "../../../lib/adminDashboard/client";
import type { SettlementHold } from "../../../types/adminDashboard";
import DisputesTable from "./_components/DisputesTable";
import HoldsPanel from "./_components/HoldsPanel";
import IncidentsTable from "./_components/IncidentsTable";

export default function AdminRiskPage() {
  const [holds, setHolds] = useState<SettlementHold[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await listFinancialHolds();
        if (!active) return;
        setHolds(Array.isArray(response.holds) ? response.holds : []);
      } catch (requestError: any) {
        if (!active) return;
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
        <h2 className="text-xl font-semibold text-slate-900">Risk & Incidents</h2>
        <p className="text-sm text-slate-600">Risk domain remains read-only in B4. Holds are live; incidents/disputes await backend integration.</p>
      </header>

      {loading ? <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading risk surface...</div> : null}
      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}

      {!loading ? <HoldsPanel holds={holds} /> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <IncidentsTable backendAvailable={false} />
        <DisputesTable backendAvailable={false} />
      </div>
    </div>
  );
}
