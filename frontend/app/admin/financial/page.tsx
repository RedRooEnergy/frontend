"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AuditReceiptToast from "../_components/AuditReceiptToast";
import BeforeAfterDiffPanel from "../_components/BeforeAfterDiffPanel";
import ReasonRequiredModal from "../_components/ReasonRequiredModal";
import {
  createFinancialHold,
  getFinancialConfig,
  listFinancialHolds,
  overrideFinancialHold,
  updateFinancialConfig,
} from "../../../lib/adminDashboard/client";
import type {
  AdminAuditReceipt,
  FinancialConfigResponse,
  FinancialConfigUpdatePayload,
  SettlementHold,
} from "../../../types/adminDashboard";
import CreateHoldDrawer from "./_components/CreateHoldDrawer";
import EscrowPolicyForm from "./_components/EscrowPolicyForm";
import FeeConfigForm from "./_components/FeeConfigForm";
import FinancialConfigCards from "./_components/FinancialConfigCards";
import FxPolicyForm from "./_components/FxPolicyForm";
import HoldOverrideModal from "./_components/HoldOverrideModal";
import HoldsTable from "./_components/HoldsTable";

type DraftType = "feeConfig" | "fxPolicy" | "escrowPolicy";

type PendingDraft = {
  type: DraftType;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
};

export default function AdminFinancialPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<FinancialConfigResponse | null>(null);
  const [holds, setHolds] = useState<SettlementHold[]>([]);
  const [pendingDraft, setPendingDraft] = useState<PendingDraft | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [receipt, setReceipt] = useState<AdminAuditReceipt | null>(null);
  const [createHoldOpen, setCreateHoldOpen] = useState(false);
  const [overrideHold, setOverrideHold] = useState<SettlementHold | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [configResponse, holdsResponse] = await Promise.all([getFinancialConfig(), listFinancialHolds()]);
      setConfig(configResponse);
      setHolds(Array.isArray(holdsResponse.holds) ? holdsResponse.holds : []);
    } catch (requestError: any) {
      setError(String(requestError?.message || requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    loadData().catch(() => {
      if (!active) return;
    });
    return () => {
      active = false;
    };
  }, [loadData]);

  const onReviewDraft = useCallback(
    (type: DraftType, after: Record<string, unknown>) => {
      if (!config) return;
      const current = config[type];
      setPendingDraft({
        type,
        before: (current?.rules as Record<string, unknown>) || {},
        after,
      });
      setConfirmOpen(false);
      setReason("");
    },
    [config]
  );

  const submitDraft = useCallback(async () => {
    if (!pendingDraft) return;
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setError("Reason is required before submitting a mutation.");
      return;
    }

    setSaving(true);
    setError(null);

    const payload: FinancialConfigUpdatePayload = {
      reason: trimmedReason,
      [pendingDraft.type]: pendingDraft.after,
    };

    try {
      const response = await updateFinancialConfig(payload);
      const update = response.updates.find((row) => row.type === pendingDraft.type) || response.updates[0];
      setReceipt(
        update
          ? {
              auditId: update.auditId,
              entityId: update.configId,
              version: update.version,
              hash: update.hash,
              type: update.type,
            }
          : null
      );
      setPendingDraft(null);
      setConfirmOpen(false);
      setReason("");
      await loadData();
    } catch (mutationError: any) {
      setError(String(mutationError?.message || mutationError));
    } finally {
      setSaving(false);
    }
  }, [pendingDraft, reason, loadData]);

  const content = useMemo(() => {
    if (loading) {
      return <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading financial governance data...</div>;
    }

    if (error && !config) {
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

        <section className="grid gap-4 xl:grid-cols-3">
          <FeeConfigForm
            initialRules={(config.feeConfig?.rules as Record<string, unknown>) || null}
            onReview={(draft) => onReviewDraft("feeConfig", draft)}
            disabled={saving}
          />
          <FxPolicyForm
            initialRules={(config.fxPolicy?.rules as Record<string, unknown>) || null}
            onReview={(draft) => onReviewDraft("fxPolicy", draft)}
            disabled={saving}
          />
          <EscrowPolicyForm
            initialRules={(config.escrowPolicy?.rules as Record<string, unknown>) || null}
            onReview={(draft) => onReviewDraft("escrowPolicy", draft)}
            disabled={saving}
          />
        </section>

        {pendingDraft ? (
          <section className="space-y-3">
            <BeforeAfterDiffPanel before={pendingDraft.before} after={pendingDraft.after} />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white"
              >
                Submit change (reason required)
              </button>
            </div>
          </section>
        ) : null}

        <section className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Settlement Holds</h2>
              <p className="text-sm text-slate-600">Create and override actions are reason-gated and audit-backed.</p>
            </div>
            <button
              type="button"
              onClick={() => setCreateHoldOpen(true)}
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white"
            >
              Create hold
            </button>
          </div>
          <HoldsTable holds={holds} onOverride={(hold) => setOverrideHold(hold)} />
        </section>
      </div>
    );
  }, [loading, error, config, holds, pendingDraft, onReviewDraft, saving]);

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-xl font-semibold text-slate-900">Financial Controls</h2>
        <p className="text-sm text-slate-600">Mutation protocol: review diff, provide reason, confirm action, capture immutable audit receipt.</p>
      </header>

      {error && config ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
      ) : null}

      <AuditReceiptToast receipt={receipt} onDismiss={() => setReceipt(null)} />
      {content}

      <ReasonRequiredModal
        open={confirmOpen}
        title="Confirm financial configuration mutation"
        subtitle="This action will create a new version and retire the prior ACTIVE record."
        reason={reason}
        onReasonChange={setReason}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={submitDraft}
        confirmLabel={saving ? "Saving..." : "Confirm mutation"}
        confirmDisabled={saving || !reason.trim()}
      />

      <CreateHoldDrawer
        open={createHoldOpen}
        onClose={() => setCreateHoldOpen(false)}
        onSubmit={async (payload) => {
          const response = await createFinancialHold(payload);
          setReceipt({
            auditId: response.auditId,
            entityId: response.entityId,
          });
          await loadData();
        }}
      />

      <HoldOverrideModal
        hold={overrideHold}
        onClose={() => setOverrideHold(null)}
        onSubmit={async ({ holdId, reason: holdReason, justification, durationHours }) => {
          const response = await overrideFinancialHold(holdId, {
            reason: holdReason,
            justification,
            durationHours,
          });
          setReceipt({
            auditId: response.auditId,
            entityId: response.entityId,
          });
          await loadData();
        }}
      />
    </div>
  );
}
