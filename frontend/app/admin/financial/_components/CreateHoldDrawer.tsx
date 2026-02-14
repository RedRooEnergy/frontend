"use client";

import { useState } from "react";
import type { CreateHoldPayload } from "../../../../types/adminDashboard";

type CreateHoldDrawerProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateHoldPayload) => Promise<void>;
};

type ScopeType = "orderId" | "paymentId" | "payoutId" | "supplierId";

export default function CreateHoldDrawer({ open, onClose, onSubmit }: CreateHoldDrawerProps) {
  const [subsystem, setSubsystem] = useState<CreateHoldPayload["subsystem"]>("PAYMENTS");
  const [scopeType, setScopeType] = useState<ScopeType>("orderId");
  const [scopeValue, setScopeValue] = useState("");
  const [reason, setReason] = useState("");
  const [reasonCode, setReasonCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30">
      <div className="h-full w-full max-w-md overflow-y-auto bg-white p-5 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900">Create settlement hold</h3>
        <p className="mt-1 text-sm text-slate-600">All fields are mutation-audited. Reason is mandatory.</p>

        <label className="mt-4 block text-sm font-medium text-slate-700">Subsystem</label>
        <select
          value={subsystem}
          onChange={(event) => setSubsystem(event.target.value as CreateHoldPayload["subsystem"])}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="PAYMENTS">PAYMENTS</option>
          <option value="FREIGHT">FREIGHT</option>
          <option value="COMPLIANCE">COMPLIANCE</option>
          <option value="RISK">RISK</option>
        </select>

        <label className="mt-4 block text-sm font-medium text-slate-700">Scope type</label>
        <select
          value={scopeType}
          onChange={(event) => setScopeType(event.target.value as ScopeType)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="orderId">Order ID</option>
          <option value="paymentId">Payment ID</option>
          <option value="payoutId">Payout ID</option>
          <option value="supplierId">Supplier ID</option>
        </select>

        <label className="mt-4 block text-sm font-medium text-slate-700">Scope value</label>
        <input
          value={scopeValue}
          onChange={(event) => setScopeValue(event.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="Enter identifier"
        />

        <label className="mt-4 block text-sm font-medium text-slate-700">Reason (required)</label>
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={3}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="Document hold rationale"
        />

        <label className="mt-4 block text-sm font-medium text-slate-700">Reason code (optional)</label>
        <input
          value={reasonCode}
          onChange={(event) => setReasonCode(event.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="REVIEW_PENDING"
        />

        {error ? <p className="mt-3 rounded border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">{error}</p> : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={async () => {
              if (!scopeValue.trim()) {
                setError("Scope value is required");
                return;
              }
              if (!reason.trim()) {
                setError("Reason is required");
                return;
              }
              setError(null);
              setSaving(true);
              try {
                await onSubmit({
                  subsystem,
                  reason: reason.trim(),
                  reasonCode: reasonCode.trim() || undefined,
                  scope: {
                    [scopeType]: scopeValue.trim(),
                  },
                });
                setScopeValue("");
                setReason("");
                setReasonCode("");
                onClose();
              } catch (submitError: any) {
                setError(String(submitError?.message || submitError));
              } finally {
                setSaving(false);
              }
            }}
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create hold"}
          </button>
        </div>
      </div>
    </div>
  );
}
