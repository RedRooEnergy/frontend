"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminDashboardLayout from "../../../../components/AdminDashboardLayout";
import { getSession } from "../../../../lib/store";
import { useRouter } from "next/navigation";
import { getAdminAuthHeaders } from "../../../../lib/auth/clientAdminHeaders";
import { EMAIL_EVENTS } from "../../../../lib/email/events";
import { EMAIL_POLICY } from "../../../../lib/email/policies";

interface EmailTemplateRow {
  templateId: string;
  eventCode: string;
  roleScope: string;
  language: string;
  version: number;
  status: string;
  updatedAt?: string;
}

interface EmailDispatchRow {
  dispatchId: string;
  eventCode: string;
  recipientRole: string;
  recipientUserId: string;
  sendStatus: string;
  createdAt: string;
}

interface EmailEventPolicyRow {
  eventCode: string;
  isDisabled: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

export default function AdminEmailGovernancePage() {
  const router = useRouter();
  const session = getSession();
  const [templates, setTemplates] = useState<EmailTemplateRow[]>([]);
  const [dispatches, setDispatches] = useState<EmailDispatchRow[]>([]);
  const [policies, setPolicies] = useState<EmailEventPolicyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [seedMessage, setSeedMessage] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");
  const [exportManifest, setExportManifest] = useState<any>(null);
  const [exportManifestHash, setExportManifestHash] = useState<string>("");
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [policyLoading, setPolicyLoading] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [dispatchEventFilter, setDispatchEventFilter] = useState<string>("");
  const [dispatchStatusFilter, setDispatchStatusFilter] = useState<string>("");
  const [dispatchRoleFilter, setDispatchRoleFilter] = useState<string>("");
  const [dispatchSearch, setDispatchSearch] = useState<string>("");

  useEffect(() => {
    if (!session || session.role !== "admin") {
      router.replace("/signin?role=admin");
    }
  }, [router, session]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const dispatchParams = new URLSearchParams();
      if (dispatchEventFilter) dispatchParams.set("eventCode", dispatchEventFilter);
      if (dispatchStatusFilter) dispatchParams.set("sendStatus", dispatchStatusFilter);
      if (dispatchRoleFilter) dispatchParams.set("recipientRole", dispatchRoleFilter);
      const [templatesRes, dispatchesRes, policiesRes] = await Promise.all([
        fetch("/api/admin/email/templates", { headers: getAdminAuthHeaders() }),
        fetch(`/api/admin/email/dispatches?${dispatchParams.toString()}`, { headers: getAdminAuthHeaders() }),
        fetch("/api/admin/email/policies", { headers: getAdminAuthHeaders() }),
      ]);
      if (!templatesRes.ok || !dispatchesRes.ok || !policiesRes.ok) {
        throw new Error("Unable to load email governance data.");
      }

      const templatesJson = await templatesRes.json();
      const dispatchJson = await dispatchesRes.json();
      const policiesJson = await policiesRes.json();

      setTemplates(templatesJson.templates ?? []);
      const items = dispatchJson.items ?? [];
      const filtered = dispatchSearch
        ? items.filter((row: EmailDispatchRow) => {
            const haystack = `${row.dispatchId} ${row.eventCode} ${row.recipientUserId} ${row.recipientRole}`.toLowerCase();
            return haystack.includes(dispatchSearch.toLowerCase());
          })
        : items;
      setDispatches(filtered);
      setPolicies(policiesJson.policies ?? []);
      setError(null);
    } catch (err: any) {
      setError(err?.message || "Unable to load email governance data.");
    } finally {
      setLoading(false);
    }
  }, [dispatchEventFilter, dispatchRoleFilter, dispatchSearch, dispatchStatusFilter]);

  const seedTemplates = async () => {
    try {
      const res = await fetch("/api/admin/email/seed", {
        method: "POST",
        headers: getAdminAuthHeaders(),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Seed failed");
      setSeedMessage(`Seeded templates: ${json.summary.created} created, ${json.summary.skipped} skipped.`);
      await load();
      setTimeout(() => setSeedMessage(""), 3000);
    } catch (err: any) {
      setSeedMessage(err?.message || "Seed failed");
      setTimeout(() => setSeedMessage(""), 3000);
    }
  };

  useEffect(() => {
    if (session?.role === "admin") load();
  }, [session, load]);

  const sentCount = useMemo(() => dispatches.filter((d) => d.sendStatus === "SENT").length, [dispatches]);
  const failedCount = useMemo(() => dispatches.filter((d) => d.sendStatus === "FAILED").length, [dispatches]);
  const eventCodes = useMemo(() => Object.values(EMAIL_EVENTS), []);
  const policyMap = useMemo(() => {
    const map = new Map<string, EmailEventPolicyRow>();
    policies.forEach((policy) => map.set(policy.eventCode, policy));
    return map;
  }, [policies]);
  const globalDisabled = policyMap.get("__ALL__")?.isDisabled ?? false;

  const togglePolicy = async (eventCode: string, nextState: boolean) => {
    try {
      setPolicyLoading(true);
      await fetch("/api/admin/email/policies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAdminAuthHeaders(),
        },
        body: JSON.stringify({ eventCode, isDisabled: nextState }),
      });
      const res = await fetch("/api/admin/email/policies", { headers: getAdminAuthHeaders() });
      const json = await res.json();
      setPolicies(json.policies ?? []);
    } finally {
      setPolicyLoading(false);
    }
  };

  const requestPreview = async (templateId: string, version: number) => {
    try {
      setPreviewLoading(true);
      setPreviewError(null);
      const res = await fetch(`/api/admin/email/preview?templateId=${encodeURIComponent(templateId)}&version=${version}`, {
        headers: getAdminAuthHeaders(),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Preview failed");
      setPreview(json);
    } catch (err: any) {
      setPreviewError(err?.message || "Preview failed");
    } finally {
      setPreviewLoading(false);
    }
  };

  const buildExportUrl = (format: "json" | "pdf") => {
    const params = new URLSearchParams();
    if (exportStartDate) params.set("startDate", exportStartDate);
    if (exportEndDate) params.set("endDate", exportEndDate);
    params.set("format", format);
    return `/api/admin/email-audit/export?${params.toString()}`;
  };

  const downloadExport = async (format: "json" | "pdf") => {
    try {
      setExportLoading(true);
      setExportError(null);
      const res = await fetch(buildExportUrl(format), { headers: getAdminAuthHeaders() });
      if (!res.ok) throw new Error("Unable to download export.");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = format === "pdf" ? "email-audit.pdf" : "email-audit.json";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setExportError(err?.message || "Export failed");
    } finally {
      setExportLoading(false);
    }
  };

  const previewManifest = async () => {
    try {
      setExportLoading(true);
      setExportError(null);
      const res = await fetch(buildExportUrl("json"), { headers: getAdminAuthHeaders() });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Export failed");
      setExportManifest(json.manifest);
      setExportManifestHash(json.manifestHash || "");
    } catch (err: any) {
      setExportError(err?.message || "Export failed");
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <AdminDashboardLayout title="Email Governance">
      <div className="buyer-card space-y-4">
        <div className="buyer-card-header">
          <div>
            <div className="buyer-section-title">Governed Email Templates</div>
            <p className="text-sm text-muted">LOCKED templates used for operational emails.</p>
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-2 rounded-md border border-slate-200 text-sm font-semibold" onClick={load}>
              Refresh
            </button>
            <button className="px-3 py-2 rounded-md bg-slate-900 text-white text-sm font-semibold" onClick={seedTemplates}>
              Seed templates
            </button>
          </div>
        </div>

        {seedMessage && <p className="text-sm text-emerald-700">{seedMessage}</p>}
        {loading ? (
          <p className="text-sm text-muted">Loading email templates…</p>
        ) : templates.length === 0 ? (
          <p className="text-sm text-muted">No templates found.</p>
        ) : (
          <div className="buyer-table">
            <div className="buyer-table-header">
              <div>Template</div>
              <div>Event</div>
              <div>Role</div>
              <div>Lang</div>
              <div>Version</div>
              <div>Status</div>
              <div>Preview</div>
            </div>
            {templates.map((template) => (
              <div key={`${template.templateId}-${template.version}`} className="buyer-table-row">
                <div className="text-sm font-semibold">{template.templateId}</div>
                <div className="text-xs text-muted">{template.eventCode}</div>
                <div className="text-xs text-muted">{template.roleScope}</div>
                <div className="text-xs text-muted">{template.language}</div>
                <div className="text-xs text-muted">v{template.version}</div>
                <div className="text-xs text-muted">{template.status}</div>
                <div>
                  <button
                    className="text-xs text-brand-700 font-semibold"
                    onClick={() => requestPreview(template.templateId, template.version)}
                    disabled={previewLoading}
                  >
                    Preview
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="buyer-card space-y-4">
        <div className="buyer-card-header">
          <div>
            <div className="buyer-section-title">Event Kill Switches</div>
            <p className="text-sm text-muted">Disable sends by event or globally.</p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={globalDisabled}
                disabled={policyLoading}
                onChange={(event) => togglePolicy("__ALL__", event.target.checked)}
              />
              <span className="font-semibold">Global stop</span>
            </label>
          </div>
        </div>

        {globalDisabled && (
          <div className="text-sm text-amber-700">
            Global stop is active. All outbound email events are currently blocked.
          </div>
        )}

        <div className="buyer-table">
          <div className="buyer-table-header">
            <div>Event</div>
            <div>Status</div>
            <div>Disabled</div>
            <div>Updated</div>
          </div>
          {eventCodes.map((code) => {
            const policy = policyMap.get(code);
            const isDisabled = policy?.isDisabled ?? false;
            return (
              <div key={code} className="buyer-table-row">
                <div className="text-xs text-muted">{code}</div>
                <div className="text-xs text-muted">{isDisabled ? "Blocked" : "Active"}</div>
                <div className="text-xs text-muted">
                  <input
                    type="checkbox"
                    checked={isDisabled}
                    disabled={policyLoading}
                    onChange={(event) => togglePolicy(code, event.target.checked)}
                  />
                </div>
                <div className="text-xs text-muted">{policy?.updatedAt || "—"}</div>
              </div>
            );
          })}
        </div>
      </div>

      {preview && (
        <div className="buyer-card space-y-4">
          <div className="buyer-card-header">
            <div>
              <div className="buyer-section-title">Template Preview</div>
              <p className="text-sm text-muted">
                {preview.templateId} • {preview.eventCode} • {preview.roleScope}
              </p>
            </div>
            <button className="px-3 py-2 rounded-md border border-slate-200 text-sm font-semibold" onClick={() => setPreview(null)}>
              Clear preview
            </button>
          </div>

          {previewError && <p className="text-sm text-amber-700">{previewError}</p>}
          {previewLoading && <p className="text-sm text-muted">Loading preview…</p>}
          {!previewLoading && (
            <div className="grid grid-cols-2 gap-4">
              <div className="buyer-section-block text-sm space-y-2">
                <div className="text-xs text-muted">Subject</div>
                <div className="font-semibold">{preview.subject}</div>
                <div className="text-xs text-muted mt-2">HTML</div>
                <div className="border rounded-md p-3 bg-white" dangerouslySetInnerHTML={{ __html: preview.html }} />
              </div>
              <div className="buyer-section-block text-sm space-y-2">
                <div className="text-xs text-muted">Rendered hash</div>
                <div className="text-xs break-all">{preview.hash}</div>
                <div className="text-xs text-muted mt-2">Text</div>
                <pre className="text-xs whitespace-pre-wrap">{preview.text}</pre>
                <div className="text-xs text-muted mt-2">Variables</div>
                <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(preview.variables, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="buyer-card space-y-4">
        <div className="buyer-card-header">
          <div>
            <div className="buyer-section-title">Audit Export</div>
            <p className="text-sm text-muted">Generate JSON/PDF bundles with manifest hashes.</p>
          </div>
          <div className="flex gap-2">
            <button
              className="px-3 py-2 rounded-md border border-slate-200 text-sm font-semibold"
              onClick={previewManifest}
              disabled={exportLoading}
            >
              Preview manifest
            </button>
            <button
              className="px-3 py-2 rounded-md border border-slate-200 text-sm font-semibold"
              onClick={() => downloadExport("json")}
              disabled={exportLoading}
            >
              Download JSON
            </button>
            <button
              className="px-3 py-2 rounded-md bg-slate-900 text-white text-sm font-semibold"
              onClick={() => downloadExport("pdf")}
              disabled={exportLoading}
            >
              Download PDF
            </button>
          </div>
        </div>

        <div className="buyer-form-grid">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-muted">Start date</label>
            <input
              type="date"
              className="border rounded-md px-3 py-2 text-sm"
              value={exportStartDate}
              onChange={(event) => setExportStartDate(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-muted">End date</label>
            <input
              type="date"
              className="border rounded-md px-3 py-2 text-sm"
              value={exportEndDate}
              onChange={(event) => setExportEndDate(event.target.value)}
            />
          </div>
        </div>

        {exportManifest && (
          <div className="buyer-section-block text-sm">
            <div className="font-semibold">Manifest hash</div>
            <div className="text-xs text-muted break-all">{exportManifestHash}</div>
            <pre className="mt-3 text-xs whitespace-pre-wrap">{JSON.stringify(exportManifest, null, 2)}</pre>
          </div>
        )}

        {exportError && <p className="text-sm text-amber-700">{exportError}</p>}
      </div>

      <div className="buyer-card space-y-4">
        <div className="buyer-card-header">
          <div>
            <div className="buyer-section-title">Dispatch Log</div>
            <p className="text-sm text-muted">Immutable record of send attempts.</p>
          </div>
          <div className="flex gap-3 text-sm">
            <div className="text-muted">Sent: {sentCount}</div>
            <div className="text-muted">Failed: {failedCount}</div>
          </div>
        </div>

        <div className="buyer-form-grid">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-muted">Filter event</label>
            <select
              className="border rounded-md px-3 py-2 text-sm"
              value={dispatchEventFilter}
              onChange={(event) => setDispatchEventFilter(event.target.value)}
            >
              <option value="">All events</option>
              {eventCodes.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-muted">Filter status</label>
            <select
              className="border rounded-md px-3 py-2 text-sm"
              value={dispatchStatusFilter}
              onChange={(event) => setDispatchStatusFilter(event.target.value)}
            >
              <option value="">All statuses</option>
              <option value="SENT">SENT</option>
              <option value="FAILED">FAILED</option>
              <option value="QUEUED">QUEUED</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-muted">Filter role</label>
            <select
              className="border rounded-md px-3 py-2 text-sm"
              value={dispatchRoleFilter}
              onChange={(event) => setDispatchRoleFilter(event.target.value)}
            >
              <option value="">All roles</option>
              <option value="buyer">buyer</option>
              <option value="supplier">supplier</option>
              <option value="service-partner">service-partner</option>
              <option value="admin">admin</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-muted">Search</label>
            <input
              type="text"
              className="border rounded-md px-3 py-2 text-sm"
              placeholder="Dispatch ID, recipient, event"
              value={dispatchSearch}
              onChange={(event) => setDispatchSearch(event.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted">Loading dispatch logs…</p>
        ) : dispatches.length === 0 ? (
          <p className="text-sm text-muted">No dispatches recorded yet.</p>
        ) : (
          <div className="buyer-table">
            <div className="buyer-table-header">
              <div>Dispatch</div>
              <div>Event</div>
              <div>Recipient</div>
              <div>Status</div>
              <div>Created</div>
            </div>
            {dispatches.map((dispatch) => (
              <div key={dispatch.dispatchId} className="buyer-table-row">
                <div className="text-xs text-muted">{dispatch.dispatchId}</div>
                <div className="text-xs text-muted">{dispatch.eventCode}</div>
                <div className="text-xs text-muted">
                  {dispatch.recipientRole} • {dispatch.recipientUserId}
                </div>
                <div className="text-xs text-muted">{dispatch.sendStatus}</div>
                <div className="text-xs text-muted">{dispatch.createdAt}</div>
              </div>
            ))}
          </div>
        )}

        {error && <p className="text-sm text-amber-700">{error}</p>}
      </div>

      <div className="buyer-card space-y-3">
        <div className="buyer-card-header">
          <div>
            <div className="buyer-section-title">Retry Policy</div>
            <p className="text-sm text-muted">Retries are automatic. Manual resends are disabled by governance.</p>
          </div>
        </div>
        <div className="text-sm text-muted">
          Max attempts: <span className="font-semibold text-strong">{EMAIL_POLICY.retry.maxAttempts}</span>
        </div>
        <div className="text-sm text-muted">
          Base delay (ms): <span className="font-semibold text-strong">{EMAIL_POLICY.retry.baseDelayMs}</span>
        </div>
        <div className="text-sm text-muted">
          Max delay (ms): <span className="font-semibold text-strong">{EMAIL_POLICY.retry.maxDelayMs}</span>
        </div>
      </div>
    </AdminDashboardLayout>
  );
}
