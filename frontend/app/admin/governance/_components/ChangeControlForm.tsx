"use client";

import { useState } from "react";
import type { CreateChangeControlPayload } from "../../../../types/adminDashboard";

type ChangeControlFormProps = {
  onSubmit: (payload: CreateChangeControlPayload) => Promise<void>;
};

const TYPES = [
  "FEE_CHANGE",
  "FX_POLICY_CHANGE",
  "CATEGORY_ADD",
  "CERT_BODY_ADD",
  "FREIGHT_PARTNER_ADD",
  "EXTENSION_ACTIVATION",
];

export default function ChangeControlForm({ onSubmit }: ChangeControlFormProps) {
  const [type, setType] = useState(TYPES[0]);
  const [reason, setReason] = useState("");
  const [rationale, setRationale] = useState("");
  const [entityType, setEntityType] = useState("");
  const [entityId, setEntityId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">Create change control request</h3>
      <p className="mt-1 text-xs text-slate-600">Reason and rationale are mandatory before submission.</p>

      <label className="mt-4 block text-sm font-medium text-slate-700">Type</label>
      <select
        value={type}
        onChange={(event) => setType(event.target.value)}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
      >
        {TYPES.map((entry) => (
          <option key={entry} value={entry}>
            {entry}
          </option>
        ))}
      </select>

      <label htmlFor="change-control-reason" className="mt-4 block text-sm font-medium text-slate-700">
        Reason (required)
      </label>
      <textarea
        id="change-control-reason"
        aria-label="Reason (required)"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        rows={3}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
      />

      <label htmlFor="change-control-rationale" className="mt-4 block text-sm font-medium text-slate-700">
        Rationale (required)
      </label>
      <textarea
        id="change-control-rationale"
        aria-label="Rationale (required)"
        value={rationale}
        onChange={(event) => setRationale(event.target.value)}
        rows={3}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
      />

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">Scope entity type (optional)</label>
          <input
            value={entityType}
            onChange={(event) => setEntityType(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="ORDER"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Scope entity id (optional)</label>
          <input
            value={entityId}
            onChange={(event) => setEntityId(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="ORD-1002"
          />
        </div>
      </div>

      {error ? <p className="mt-3 rounded border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">{error}</p> : null}

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          disabled={saving}
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          onClick={async () => {
            if (!reason.trim()) {
              setError("Reason is required");
              return;
            }
            if (!rationale.trim()) {
              setError("Rationale is required");
              return;
            }

            setError(null);
            setSaving(true);
            try {
              await onSubmit({
                type,
                reason: reason.trim(),
                rationale: rationale.trim(),
                scope:
                  entityType.trim() || entityId.trim()
                    ? {
                        entityType: entityType.trim() || undefined,
                        entityId: entityId.trim() || undefined,
                      }
                    : undefined,
              });
              setReason("");
              setRationale("");
              setEntityType("");
              setEntityId("");
            } catch (submitError: any) {
              setError(String(submitError?.message || submitError));
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? "Submitting..." : "Submit change control"}
        </button>
      </div>
    </section>
  );
}
