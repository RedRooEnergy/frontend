"use client";

import { useState } from "react";
import type { RunAuditResponse } from "../../../../types/adminDashboard";

type RunAuditPanelProps = {
  onRun: (reason: string) => Promise<RunAuditResponse>;
};

export default function RunAuditPanel({ onRun }: RunAuditPanelProps) {
  const [reason, setReason] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RunAuditResponse | null>(null);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">Run governance audit</h3>
      <p className="mt-1 text-xs text-slate-600">Phase B2 uses a non-enforcing trigger stub and must not imply runtime enforcement changes.</p>

      <label htmlFor="run-audit-reason" className="mt-4 block text-sm font-medium text-slate-700">
        Reason (required)
      </label>
      <textarea
        id="run-audit-reason"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        rows={3}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        placeholder="Why this audit run is requested"
      />

      {error ? <p className="mt-3 rounded border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">{error}</p> : null}

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          disabled={running}
          onClick={async () => {
            if (!reason.trim()) {
              setError("Reason is required");
              return;
            }
            setError(null);
            setRunning(true);
            try {
              const response = await onRun(reason.trim());
              setResult(response);
            } catch (runError: any) {
              setError(String(runError?.message || runError));
            } finally {
              setRunning(false);
            }
          }}
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {running ? "Triggering..." : "Trigger audit"}
        </button>
      </div>

      {result ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <p className="font-semibold">Audit trigger response</p>
          <p>Status: {result.status}</p>
          <p>Message: {result.message}</p>
          <p>Audit ID: {result.auditId}</p>
        </div>
      ) : null}
    </section>
  );
}
