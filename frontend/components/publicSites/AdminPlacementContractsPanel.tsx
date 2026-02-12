"use client";

import { useEffect, useState } from "react";

type ContractRow = {
  id: string;
  entityId: string;
  entityType: string;
  tier: string;
  weeklyFeeAUD: number;
  autoRenew: boolean;
  status: string;
};

type LockRow = {
  id: string;
  weekId: string;
  entityId: string;
  entityType: string;
  tier: string;
  position: number;
  snapshotVersion: number;
  lockHash: string;
};

async function jsonRequest(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
  return body;
}

export default function AdminPlacementContractsPanel() {
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [locks, setLocks] = useState<LockRow[]>([]);
  const [weekId, setWeekId] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    entityId: "",
    entityType: "INSTALLER",
    tier: "BASIC",
    weeklyFeeAUD: "20",
    autoRenew: true,
    status: "ACTIVE",
  });

  async function refresh() {
    const payload = await jsonRequest("/api/admin/public-sites/placements/contracts");
    setContracts(payload.rows || []);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function createContract() {
    setBusy(true);
    setMessage("");
    try {
      await jsonRequest("/api/admin/public-sites/placements/contracts", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          weeklyFeeAUD: Number(form.weeklyFeeAUD),
        }),
      });
      await refresh();
      setMessage("Contract created.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to create contract");
    } finally {
      setBusy(false);
    }
  }

  async function lockWeek() {
    setBusy(true);
    setMessage("");
    try {
      await jsonRequest("/api/admin/public-sites/placements/lock-week", {
        method: "POST",
        body: JSON.stringify({ weekId }),
      });
      const payload = await jsonRequest(`/api/admin/public-sites/placements/locks?weekId=${encodeURIComponent(weekId)}`);
      setLocks(payload.rows || []);
      setMessage("Week locked.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to lock week");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="rounded border border-slate-800 bg-slate-900 p-4 space-y-3">
        <h3 className="text-lg font-semibold">Create Placement Contract</h3>
        <div className="grid gap-2 md:grid-cols-3">
          <input
            className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            placeholder="entityId"
            value={form.entityId}
            onChange={(event) => setForm((prev) => ({ ...prev, entityId: event.target.value }))}
          />
          <select
            className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            value={form.entityType}
            onChange={(event) => setForm((prev) => ({ ...prev, entityType: event.target.value }))}
          >
            <option>INSTALLER</option>
            <option>CERTIFIER</option>
            <option>INSURANCE</option>
            <option>SUPPLIER</option>
          </select>
          <select
            className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            value={form.tier}
            onChange={(event) => setForm((prev) => ({ ...prev, tier: event.target.value }))}
          >
            <option>BASIC</option>
            <option>FEATURED</option>
            <option>SPOTLIGHT</option>
          </select>
          <input
            className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            placeholder="weekly fee (AUD)"
            value={form.weeklyFeeAUD}
            onChange={(event) => setForm((prev) => ({ ...prev, weeklyFeeAUD: event.target.value }))}
          />
          <select
            className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            value={form.status}
            onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
          >
            <option>ACTIVE</option>
            <option>PAUSED</option>
            <option>CANCELLED</option>
          </select>
          <label className="flex items-center gap-2 rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={form.autoRenew}
              onChange={(event) => setForm((prev) => ({ ...prev, autoRenew: event.target.checked }))}
            />
            Auto renew
          </label>
        </div>
        <button className="rounded border px-3 py-2 text-sm" onClick={createContract} disabled={busy}>
          Save contract
        </button>
      </div>

      <div className="rounded border border-slate-800 bg-slate-900 p-4 space-y-3">
        <h3 className="text-lg font-semibold">Weekly Lock Preview</h3>
        <div className="flex gap-2">
          <input
            className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            placeholder="weekId (YYYY-WW)"
            value={weekId}
            onChange={(event) => setWeekId(event.target.value)}
          />
          <button className="rounded border px-3 py-2 text-sm" onClick={lockWeek} disabled={busy}>
            Lock week
          </button>
        </div>
      </div>

      <div className="rounded border border-slate-800 bg-slate-900 p-4">
        <h3 className="mb-2 text-lg font-semibold">Contracts</h3>
        <div className="max-h-64 overflow-auto">
          <table className="min-w-full text-xs">
            <thead className="text-left text-slate-300">
              <tr>
                <th className="p-2">Entity</th>
                <th className="p-2">Tier</th>
                <th className="p-2">Weekly fee</th>
                <th className="p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((row) => (
                <tr key={row.id} className="border-t border-slate-800">
                  <td className="p-2">{row.entityType}:{row.entityId}</td>
                  <td className="p-2">{row.tier}</td>
                  <td className="p-2">${row.weeklyFeeAUD}</td>
                  <td className="p-2">{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!contracts.length ? <p className="p-2 text-xs text-slate-500">No contracts yet.</p> : null}
        </div>
      </div>

      <div className="rounded border border-slate-800 bg-slate-900 p-4">
        <h3 className="mb-2 text-lg font-semibold">Locks</h3>
        <div className="max-h-64 overflow-auto">
          <table className="min-w-full text-xs">
            <thead className="text-left text-slate-300">
              <tr>
                <th className="p-2">Week</th>
                <th className="p-2">Entity</th>
                <th className="p-2">Tier</th>
                <th className="p-2">Pos</th>
                <th className="p-2">Snapshot</th>
                <th className="p-2">Hash</th>
              </tr>
            </thead>
            <tbody>
              {locks.map((row) => (
                <tr key={row.id} className="border-t border-slate-800">
                  <td className="p-2">{row.weekId}</td>
                  <td className="p-2">{row.entityType}:{row.entityId}</td>
                  <td className="p-2">{row.tier}</td>
                  <td className="p-2">{row.position}</td>
                  <td className="p-2">v{row.snapshotVersion}</td>
                  <td className="p-2 font-mono">{row.lockHash.slice(0, 14)}...</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!locks.length ? <p className="p-2 text-xs text-slate-500">No locks generated.</p> : null}
        </div>
      </div>

      {message ? <p className="text-sm text-slate-300">{message}</p> : null}
    </section>
  );
}
