"use client";

import { useMemo, useState } from "react";
import { DASHBOARD_ACTIONS } from "../../lib/rbac/ui";
import type { DashboardDomain } from "../../lib/rbac/types";

type Props = {
  domain: DashboardDomain;
  allowedCapabilityKeys: string[];
};

export function DashboardActionsPanel({ domain, allowedCapabilityKeys }: Props) {
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");

  const actions = useMemo(
    () =>
      DASHBOARD_ACTIONS.filter((definition) => definition.domain === domain).filter((definition) =>
        allowedCapabilityKeys.includes(`${definition.subject}:${definition.action}`)
      ),
    [allowedCapabilityKeys, domain]
  );

  async function runAction(operation: string, payload: Record<string, unknown>, actionId: string) {
    setBusyId(actionId);
    setMessage("");
    try {
      const response = await fetch(`/api/dashboard/${domain}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ operation, payload }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Action failed");
      setMessage(`Action ${operation} completed.`);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Action failed");
    } finally {
      setBusyId("");
    }
  }

  if (!actions.length) {
    return (
      <div className="rounded border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400">
        No mutation actions are available for this role in this dashboard.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded border border-slate-800 bg-slate-900 p-4">
      <h3 className="text-sm font-semibold text-slate-100">Permitted actions</h3>
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <button
            key={action.id}
            className="rounded bg-emerald-700 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-60"
            disabled={busyId === action.id}
            onClick={() => runAction(action.operation, action.payload, action.id)}
          >
            {busyId === action.id ? "Running..." : action.label}
          </button>
        ))}
      </div>
      {message ? <p className="text-xs text-slate-300">{message}</p> : null}
    </div>
  );
}

