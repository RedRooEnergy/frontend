"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminDashboardLayout from "../../../../../components/AdminDashboardLayout";
import { getSession, AdminAuditLog } from "../../../../../lib/store";
import { formatDate } from "../../../../../lib/utils";
import { getAdminAuthHeaders } from "../../../../../lib/auth/clientAdminHeaders";

export default function ServicePartnerAuditPage() {
  const router = useRouter();
  const session = getSession();
  const [partnerId, setPartnerId] = useState("");
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [migrationStatus, setMigrationStatus] = useState<string | null>(null);
  const [migrationResults, setMigrationResults] = useState<any[] | null>(null);
  const [migrationId, setMigrationId] = useState<string>("");
  const [rollbackId, setRollbackId] = useState<string>("");
  const [previewStatus, setPreviewStatus] = useState<string | null>(null);
  const [previewSources, setPreviewSources] = useState<any[] | null>(null);
  const [historyStatus, setHistoryStatus] = useState<string | null>(null);
  const [historyRuns, setHistoryRuns] = useState<any[] | null>(null);
  const [scheduleStatus, setScheduleStatus] = useState<any | null>(null);
  const isDev = process.env.NODE_ENV !== "production";

  const formatBytes = (value?: number | null) => {
    if (value === null || value === undefined) return "—";
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDateTime = (value?: string | null) => {
    if (!value) return "—";
    const d = new Date(value);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
  };

  useEffect(() => {
    if (!session || session.role !== "admin") {
      router.replace("/signin?role=admin");
    }
  }, [router, session]);

  const load = async (filterPartnerId?: string) => {
    setStatus("Loading audit logs...");
    const query = filterPartnerId ? `?partnerId=${encodeURIComponent(filterPartnerId)}` : "";
    const response = await fetch(`/api/admin/service-partners/audit${query}`, {
      credentials: "include",
      headers: getAdminAuthHeaders(),
    });
    const json = await response.json();
    if (!response.ok) {
      setStatus(json?.error || "Unable to load audit logs.");
      return;
    }
    setLogs(json.logs || []);
    setStatus(null);
  };

  useEffect(() => {
    load();
  }, []);

  const filteredLogs = useMemo(() => {
    if (!partnerId.trim()) return logs;
    return logs.filter((log) => log.targetId === partnerId.trim());
  }, [logs, partnerId]);

  const runMigration = async (dryRun: boolean) => {
    if (!isDev) return;
    setMigrationStatus(dryRun ? "Running dry-run migration..." : "Running migration...");
    setMigrationResults(null);
    setMigrationId("");
    try {
      const response = await fetch("/api/admin/service-partners/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAdminAuthHeaders() },
        body: JSON.stringify({ dryRun }),
        credentials: "include",
      });
      const json = await response.json();
      if (!response.ok) {
        setMigrationStatus(json?.error || "Migration failed.");
        return;
      }
      if (json.migrationId) {
        setMigrationId(json.migrationId);
        setRollbackId(json.migrationId);
      }
      setMigrationResults(json.results || []);
      setMigrationStatus(dryRun ? "Dry-run complete." : "Migration complete.");
    } catch {
      setMigrationStatus("Migration failed.");
    }
  };

  const loadPreview = async () => {
    if (!isDev) return;
    setPreviewStatus("Loading source preview...");
    setPreviewSources(null);
    try {
      const response = await fetch("/api/admin/service-partners/migrate", {
        credentials: "include",
        headers: getAdminAuthHeaders(),
      });
      const json = await response.json();
      if (!response.ok) {
        setPreviewStatus(json?.error || "Preview failed.");
        return;
      }
      setPreviewSources(json.previews || []);
      setPreviewStatus(null);
    } catch {
      setPreviewStatus("Preview failed.");
    }
  };

  const rollbackMigration = async () => {
    if (!isDev) return;
    if (!rollbackId.trim()) {
      setMigrationStatus("Enter a migration ID to roll back.");
      return;
    }
    setMigrationStatus("Running rollback...");
    try {
      const response = await fetch("/api/admin/service-partners/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAdminAuthHeaders() },
        body: JSON.stringify({ rollback: true, migrationId: rollbackId.trim() }),
        credentials: "include",
      });
      const json = await response.json();
      if (!response.ok) {
        setMigrationStatus(json?.error || "Rollback failed.");
        return;
      }
      setMigrationStatus("Rollback complete.");
      setMigrationResults(json.result?.deletions || []);
    } catch {
      setMigrationStatus("Rollback failed.");
    }
  };

  const loadHistory = async () => {
    if (!isDev) return;
    setHistoryStatus("Loading migration history...");
    setHistoryRuns(null);
    try {
      const response = await fetch("/api/admin/service-partners/migrate/history", {
        credentials: "include",
        headers: getAdminAuthHeaders(),
      });
      const json = await response.json();
      if (!response.ok) {
        setHistoryStatus(json?.error || "History load failed.");
        return;
      }
      setHistoryRuns(json.runs || []);
      setHistoryStatus(null);
    } catch {
      setHistoryStatus("History load failed.");
    }
  };

  const loadScheduleStatus = async () => {
    if (!isDev) return;
    const response = await fetch("/api/admin/service-partners/migrate/schedule", {
      credentials: "include",
      headers: getAdminAuthHeaders(),
    });
    const json = await response.json();
    if (response.ok) setScheduleStatus(json.status);
  };

  const setSchedule = async (enabled: boolean) => {
    if (!isDev) return;
    const response = await fetch("/api/admin/service-partners/migrate/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAdminAuthHeaders() },
      body: JSON.stringify({ enabled }),
      credentials: "include",
    });
    const json = await response.json();
    if (response.ok) setScheduleStatus(json.status);
  };

  return (
    <AdminDashboardLayout title="Service Partner Audit Log">
      <div className="buyer-card">
        <div className="buyer-card-header">
          <div>
            <div className="buyer-section-title">Audit log viewer</div>
            <p className="text-sm text-muted">Immutable admin decisions and actions.</p>
          </div>
        </div>
        <div className="buyer-form-grid">
          <div>
            <label className="text-sm font-semibold">Filter by Partner ID</label>
            <input
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
              value={partnerId}
              onChange={(event) => setPartnerId(event.target.value)}
              placeholder="e.g. sp-001"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              className="px-4 py-2 rounded-md border border-slate-200 text-sm font-semibold"
              onClick={() => load(partnerId.trim() || undefined)}
            >
              Refresh
            </button>
            <button
              className="px-4 py-2 rounded-md border border-slate-200 text-sm font-semibold"
              onClick={() => {
                setPartnerId("");
                load();
              }}
            >
              Clear
            </button>
          </div>
          <div className="flex items-end gap-2">
            <a
              className="px-4 py-2 rounded-md bg-brand-700 text-white text-sm font-semibold"
              href={`/api/admin/service-partners/audit/export?format=json${partnerId ? `&partnerId=${encodeURIComponent(partnerId)}` : ""}`}
            >
              Export JSON
            </a>
            <a
              className="px-4 py-2 rounded-md border border-slate-200 text-sm font-semibold"
              href={`/api/admin/service-partners/audit/export?format=csv${partnerId ? `&partnerId=${encodeURIComponent(partnerId)}` : ""}`}
            >
              Export CSV
            </a>
          </div>
        </div>
        {status && <p className="mt-3 text-sm text-amber-700">{status}</p>}
      </div>

      {isDev && (
        <div className="buyer-card">
          <div className="buyer-card-header">
            <div>
              <div className="buyer-section-title">Dev-only migration</div>
              <p className="text-sm text-muted">Backfill Mongo from local .data JSON files.</p>
            </div>
            <span className="buyer-pill">DEV</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="px-4 py-2 rounded-md border border-slate-200 text-sm font-semibold"
              onClick={loadPreview}
            >
              Preview sources
            </button>
            <button
              className="px-4 py-2 rounded-md border border-slate-200 text-sm font-semibold"
              onClick={() => runMigration(true)}
            >
              Dry run
            </button>
            <button
              className="px-4 py-2 rounded-md bg-brand-700 text-white text-sm font-semibold"
              onClick={() => runMigration(false)}
            >
              Run migration
            </button>
            <div className="flex items-center gap-2">
              <input
                className="rounded-md border border-slate-200 px-2 py-1 text-sm"
                placeholder="Migration ID"
                value={rollbackId}
                onChange={(event) => setRollbackId(event.target.value)}
              />
              <button
                className="px-3 py-2 rounded-md border border-slate-200 text-sm font-semibold"
                onClick={rollbackMigration}
              >
                Rollback
              </button>
            </div>
          </div>
          {migrationId && (
            <p className="mt-3 text-xs text-muted">
              Last migration ID: <span className="font-semibold">{migrationId}</span>
            </p>
          )}
          {migrationStatus && <p className="mt-2 text-sm text-amber-700">{migrationStatus}</p>}
          {previewStatus && <p className="mt-2 text-sm text-amber-700">{previewStatus}</p>}
          {previewSources && previewSources.length > 0 && (
            <div className="mt-3 overflow-x-auto rounded-md border border-slate-200">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-left text-muted">
                  <tr>
                    <th className="px-3 py-2">File</th>
                    <th className="px-3 py-2">Collection</th>
                    <th className="px-3 py-2">Exists</th>
                    <th className="px-3 py-2">Count</th>
                    <th className="px-3 py-2">Size</th>
                    <th className="px-3 py-2">Last modified</th>
                  </tr>
                </thead>
                <tbody>
                  {previewSources.map((source, index) => (
                    <tr key={`${source.file}-${index}`} className="border-t border-slate-200">
                      <td className="px-3 py-2 font-medium">{source.file}</td>
                      <td className="px-3 py-2">{source.collection}</td>
                      <td className="px-3 py-2">{String(source.exists)}</td>
                      <td className="px-3 py-2">{source.count ?? 0}</td>
                      <td className="px-3 py-2">{formatBytes(source.sizeBytes)}</td>
                      <td className="px-3 py-2">{formatDateTime(source.modifiedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {migrationResults && migrationResults.length > 0 && (
            <div className="mt-3 rounded-md border border-slate-200 p-3 text-xs text-muted">
              <pre>{JSON.stringify(migrationResults, null, 2)}</pre>
            </div>
          )}
          <div className="mt-4 border-t border-slate-200 pt-3">
            <div className="text-sm font-semibold">Migration run history</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                className="px-3 py-2 rounded-md border border-slate-200 text-sm font-semibold"
                onClick={loadHistory}
              >
                Load history
              </button>
            </div>
            {historyStatus && <p className="mt-2 text-sm text-amber-700">{historyStatus}</p>}
            {historyRuns && historyRuns.length > 0 && (
              <div className="mt-3 overflow-x-auto rounded-md border border-slate-200">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-left text-muted">
                    <tr>
                      <th className="px-3 py-2">Run ID</th>
                      <th className="px-3 py-2">Mode</th>
                      <th className="px-3 py-2">Dry run</th>
                      <th className="px-3 py-2">Actor</th>
                      <th className="px-3 py-2">Trigger</th>
                      <th className="px-3 py-2">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyRuns.map((run, index) => (
                      <tr key={`${run.migrationId}-${index}`} className="border-t border-slate-200">
                        <td className="px-3 py-2 font-medium">{run.migrationId}</td>
                        <td className="px-3 py-2">{run.mode}</td>
                        <td className="px-3 py-2">{String(run.dryRun)}</td>
                        <td className="px-3 py-2">{run.actorId || "—"}</td>
                        <td className="px-3 py-2">{run.trigger || "—"}</td>
                        <td className="px-3 py-2">{formatDateTime(run.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="mt-4 border-t border-slate-200 pt-3">
            <div className="text-sm font-semibold">Nightly migration schedule</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                className="px-3 py-2 rounded-md border border-slate-200 text-sm font-semibold"
                onClick={loadScheduleStatus}
              >
                Refresh status
              </button>
              <button
                className="px-3 py-2 rounded-md border border-slate-200 text-sm font-semibold"
                onClick={() => setSchedule(true)}
              >
                Enable schedule
              </button>
              <button
                className="px-3 py-2 rounded-md border border-slate-200 text-sm font-semibold"
                onClick={() => setSchedule(false)}
              >
                Disable schedule
              </button>
            </div>
            {scheduleStatus && (
              <p className="mt-2 text-xs text-muted">
                Enabled: {String(scheduleStatus.enabled)} | Interval: {scheduleStatus.intervalHours || 24}h | Last run:{" "}
                {scheduleStatus.lastRunAt || "—"}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="buyer-card">
        <div className="buyer-card-header">
          <div>
            <div className="buyer-section-title">Audit entries</div>
            <p className="text-sm text-muted">Most recent first.</p>
          </div>
          <span className="buyer-pill">{filteredLogs.length} entries</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="py-2">Time</th>
                <th>Action</th>
                <th>Target</th>
                <th>Reason</th>
                <th>Notes</th>
                <th>Actor</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id} className="border-t border-slate-200">
                  <td className="py-2 whitespace-nowrap">{formatDate(log.createdAt)}</td>
                  <td className="font-semibold">{log.action}</td>
                  <td>{log.targetId}</td>
                  <td>{log.reasonCode || "—"}</td>
                  <td className="max-w-xs truncate" title={log.notes || ""}>
                    {log.notes || "—"}
                  </td>
                  <td>{log.actorId}</td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-sm text-muted">
                    No audit entries found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminDashboardLayout>
  );
}
