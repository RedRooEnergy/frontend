"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AuditReceiptToast from "../_components/AuditReceiptToast";
import StatusPill from "../_components/StatusPill";
import {
  createGovernanceChangeControl,
  getGovernanceStatus,
  listGovernanceChangeControls,
} from "../../../lib/adminDashboard/client";
import type {
  AdminAuditReceipt,
  ChangeControlEvent,
  CreateChangeControlPayload,
  GovernanceStatusResponse,
} from "../../../types/adminDashboard";
import ChangeControlForm from "./_components/ChangeControlForm";
import ChangeControlTable from "./_components/ChangeControlTable";
import GovernanceStatusMatrix from "./_components/GovernanceStatusMatrix";
import SubSystemBadgeStrip from "./_components/SubSystemBadgeStrip";

function badgeToneFromOverall(overall: GovernanceStatusResponse["overall"]) {
  if (overall === "PASS") return "green" as const;
  if (overall === "FAIL") return "red" as const;
  return "amber" as const;
}

export default function AdminGovernancePage() {
  const [status, setStatus] = useState<GovernanceStatusResponse | null>(null);
  const [changeControls, setChangeControls] = useState<ChangeControlEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<AdminAuditReceipt | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statusResponse, changeControlsResponse] = await Promise.all([
        getGovernanceStatus(),
        listGovernanceChangeControls(),
      ]);
      setStatus(statusResponse);
      setChangeControls(Array.isArray(changeControlsResponse.items) ? changeControlsResponse.items : []);
    } catch (requestError: any) {
      setError(String(requestError?.message || requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    load().catch(() => {
      if (!active) return;
    });
    return () => {
      active = false;
    };
  }, [load]);

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

        <section className="grid gap-4 xl:grid-cols-[1.1fr_1.9fr]">
          <ChangeControlForm
            onSubmit={async (payload: CreateChangeControlPayload) => {
              const result = await createGovernanceChangeControl(payload);
              setReceipt({
                auditId: result.auditId,
                entityId: result.entityId,
              });
              await load();
            }}
          />
          <div>
            <h3 className="mb-2 text-base font-semibold text-slate-900">Change Control Ledger</h3>
            <ChangeControlTable items={changeControls} />
          </div>
        </section>
      </div>
    );
  }, [loading, error, status, changeControls, load]);

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-xl font-semibold text-slate-900">Governance Controls</h2>
        <p className="text-sm text-slate-600">Status is live. Change-control mutations are reason- and rationale-gated with immutable audit receipts.</p>
      </header>

      <AuditReceiptToast receipt={receipt} onDismiss={() => setReceipt(null)} />
      {content}
    </div>
  );
}
