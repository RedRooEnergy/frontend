"use client";

import { useEffect, useMemo, useState } from "react";
import { getFinancialConfig, listFinancialHolds } from "../../../lib/adminDashboard/client";
import type { FinancialConfigResponse, SettlementHold } from "../../../types/adminDashboard";
import FinancialConfigCards from "./_components/FinancialConfigCards";
import HoldsTable from "./_components/HoldsTable";

export default function AdminFinancialPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<FinancialConfigResponse | null>(null);
  const [holds, setHolds] = useState<SettlementHold[]>([]);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [configResponse, holdsResponse] = await Promise.all([getFinancialConfig(), listFinancialHolds()]);
        if (!active) return;
        setConfig(configResponse);
        setHolds(Array.isArray(holdsResponse.holds) ? holdsResponse.holds : []);
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

  const content = useMemo(() => {
    if (loading) {
      return <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading financial governance data...</div>;
    }

    if (error) {
      return (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          Failed to load financial dashboard data: {error}
        </div>
      );
    }

    if (!config) {
      return <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">No financial configuration found.</div>;
    }

    return (
      <div className="space-y-4">
        <FinancialConfigCards config={config} />
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-900">Settlement Holds</h2>
          <p className="text-sm text-slate-600">Read-only in B1.2. Mutation controls are enabled in the next commit.</p>
          <HoldsTable holds={holds} />
        </section>
      </div>
    );
  }, [loading, error, config, holds]);

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-xl font-semibold text-slate-900">Financial Controls</h2>
        <p className="text-sm text-slate-600">Version transparency is mandatory: active version, effective timestamp, and canonical hash are visible.</p>
      </header>
      {content}
    </div>
  );
}
