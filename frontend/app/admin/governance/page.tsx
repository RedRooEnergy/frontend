"use client";

import { useEffect, useMemo, useState } from "react";
import { getGovernanceStatus } from "../../../lib/adminDashboard/client";
import type { GovernanceStatusResponse } from "../../../types/adminDashboard";
import StatusPill from "../_components/StatusPill";
import GovernanceStatusMatrix from "./_components/GovernanceStatusMatrix";
import SubSystemBadgeStrip from "./_components/SubSystemBadgeStrip";

function badgeToneFromOverall(overall: GovernanceStatusResponse["overall"]) {
  if (overall === "PASS") return "green" as const;
  if (overall === "FAIL") return "red" as const;
  return "amber" as const;
}

export default function AdminGovernancePage() {
  const [status, setStatus] = useState<GovernanceStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await getGovernanceStatus();
        if (!active) return;
        setStatus(response);
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
      return <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading governance status...</div>;
    }

    if (error) {
      return (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          Failed to load governance status: {error}
        </div>
      );
    }

    if (!status) {
      return <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">No governance data available.</div>;
    }

    return (
      <div className="space-y-4">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-600">Overall</p>
            <div className="mt-2">
              <StatusPill label={status.overall} tone={badgeToneFromOverall(status.overall)} />
            </div>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-600">Governance score</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{status.governanceScore}</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-600">Fail count</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{status.summary.failCount}</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-600">No-data count</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{status.summary.noDataCount}</p>
          </article>
        </section>

        <SubSystemBadgeStrip checks={status.governanceChecks} />
        <GovernanceStatusMatrix status={status} />
      </div>
    );
  }, [loading, error, status]);

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-xl font-semibold text-slate-900">Governance Controls</h2>
        <p className="text-sm text-slate-600">Read-only snapshot in B2.1. Mutation controls are introduced in subsequent commits.</p>
      </header>
      {content}
    </div>
  );
}
