"use client";

import { useState } from "react";
import type { SettlementHold } from "../../../../types/adminDashboard";

type HoldOverrideModalProps = {
  hold: SettlementHold | null;
  onClose: () => void;
  onSubmit: (input: { holdId: string; reason: string; justification: string; durationHours?: number }) => Promise<void>;
};

export default function HoldOverrideModal({ hold, onClose, onSubmit }: HoldOverrideModalProps) {
  const [reason, setReason] = useState("");
  const [justification, setJustification] = useState("");
  const [durationHours, setDurationHours] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!hold) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900">Override settlement hold</h3>
        <p className="mt-1 text-sm text-slate-600">Hold: {hold.holdId}</p>

        <label className="mt-4 block text-sm font-medium text-slate-700">Reason (required)</label>
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={3}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="Override rationale"
        />

        <label className="mt-4 block text-sm font-medium text-slate-700">Justification (required)</label>
        <textarea
          value={justification}
          onChange={(event) => setJustification(event.target.value)}
          rows={3}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="Detailed justification"
        />

        <label className="mt-4 block text-sm font-medium text-slate-700">Duration hours (optional)</label>
        <input
          type="number"
          min={1}
          value={durationHours}
          onChange={(event) => setDurationHours(event.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="24"
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
              if (!reason.trim()) {
                setError("Reason is required");
                return;
              }
              if (!justification.trim()) {
                setError("Justification is required");
                return;
              }
              setError(null);
              setSaving(true);
              try {
                await onSubmit({
                  holdId: hold.holdId,
                  reason: reason.trim(),
                  justification: justification.trim(),
                  durationHours: durationHours.trim() ? Number(durationHours) : undefined,
                });
                setReason("");
                setJustification("");
                setDurationHours("");
                onClose();
              } catch (submitError: any) {
                setError(String(submitError?.message || submitError));
              } finally {
                setSaving(false);
              }
            }}
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Overriding..." : "Override hold"}
          </button>
        </div>
      </div>
    </div>
  );
}
