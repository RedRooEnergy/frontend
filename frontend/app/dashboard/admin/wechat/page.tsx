"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminDashboardLayout from "../../../../components/AdminDashboardLayout";
import { getSession } from "../../../../lib/store";
import { getAdminAuthHeaders } from "../../../../lib/auth/clientAdminHeaders";
import { formatDate } from "../../../../lib/utils";

type DispatchRow = {
  dispatchId: string;
  eventCode: string;
  recipientBindingId: string;
  createdAt: string;
  latestProviderStatus?: {
    providerStatus: "QUEUED" | "SENT" | "DELIVERED" | "FAILED";
  } | null;
};

type BindingRow = {
  bindingId: string;
  entityType: "SUPPLIER" | "ADMIN" | "BUYER";
  entityId: string;
  status: "PENDING" | "VERIFIED" | "SUSPENDED" | "REVOKED";
  updatedAt: string;
};

export default function AdminWeChatGovernancePage() {
  const router = useRouter();
  const session = getSession();
  const [dispatches, setDispatches] = useState<DispatchRow[]>([]);
  const [bindings, setBindings] = useState<BindingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session || session.role !== "admin") {
      router.replace("/signin?role=admin");
    }
  }, [router, session]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [dispatchRes, bindingRes] = await Promise.all([
        fetch("/api/admin/wechat/dispatches?limit=100", { headers: getAdminAuthHeaders() }),
        fetch("/api/admin/wechat/bindings?limit=100", { headers: getAdminAuthHeaders() }),
      ]);

      const [dispatchJson, bindingJson] = await Promise.all([dispatchRes.json(), bindingRes.json()]);

      if (!dispatchRes.ok || !bindingRes.ok) {
        throw new Error(dispatchJson?.error || bindingJson?.error || "Unable to load WeChat governance data");
      }

      setDispatches(dispatchJson.items || []);
      setBindings(bindingJson.items || []);
      setError(null);
    } catch (err: any) {
      setError(err?.message || "Unable to load WeChat governance data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.role === "admin") {
      load();
    }
  }, [load, session]);

  async function retryDispatch(dispatchId: string) {
    await fetch("/api/admin/wechat/retry-dispatch", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...getAdminAuthHeaders(),
      },
      body: JSON.stringify({ dispatchId }),
    });
    await load();
  }

  async function updateBinding(bindingId: string, action: "suspend" | "revoke") {
    await fetch(`/api/admin/wechat/bindings/${encodeURIComponent(bindingId)}/${action}`, {
      method: "POST",
      headers: getAdminAuthHeaders(),
    });
    await load();
  }

  return (
    <AdminDashboardLayout title="WeChat Governance">
      <div className="buyer-card space-y-4">
        <div className="buyer-card-header">
          <div>
            <div className="buyer-section-title">Dispatch Monitor</div>
            <p className="text-sm text-muted">Event-bound outbound records with immutable payload hashes.</p>
          </div>
          <button className="px-3 py-2 rounded-md border border-slate-200 text-sm font-semibold" onClick={load}>
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-muted">Loading dispatches…</p>
        ) : dispatches.length === 0 ? (
          <p className="text-sm text-muted">No dispatches yet.</p>
        ) : (
          <div className="buyer-table">
            <div className="buyer-table-header">
              <div>Dispatch</div>
              <div>Event</div>
              <div>Status</div>
              <div>Created</div>
              <div>Actions</div>
            </div>
            {dispatches.map((row) => {
              const status = row.latestProviderStatus?.providerStatus || "QUEUED";
              return (
                <div key={row.dispatchId} className="buyer-table-row">
                  <div className="text-xs break-all">{row.dispatchId}</div>
                  <div className="text-xs">{row.eventCode}</div>
                  <div className="text-xs">{status}</div>
                  <div className="text-xs">{formatDate(row.createdAt)}</div>
                  <div>
                    <button
                      className="px-2 py-1 rounded-md border border-slate-200 text-xs font-semibold disabled:opacity-50"
                      disabled={status !== "FAILED"}
                      onClick={() => retryDispatch(row.dispatchId)}
                    >
                      Retry failed
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="buyer-card space-y-4">
        <div className="buyer-card-header">
          <div>
            <div className="buyer-section-title">Bindings Monitor</div>
            <p className="text-sm text-muted">Suspend or revoke channel bindings without free-form messaging.</p>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted">Loading bindings…</p>
        ) : bindings.length === 0 ? (
          <p className="text-sm text-muted">No bindings found.</p>
        ) : (
          <div className="buyer-table">
            <div className="buyer-table-header">
              <div>Binding</div>
              <div>Entity</div>
              <div>Status</div>
              <div>Updated</div>
              <div>Actions</div>
            </div>
            {bindings.map((row) => (
              <div key={row.bindingId} className="buyer-table-row">
                <div className="text-xs break-all">{row.bindingId}</div>
                <div className="text-xs">{row.entityType}:{row.entityId}</div>
                <div className="text-xs">{row.status}</div>
                <div className="text-xs">{formatDate(row.updatedAt)}</div>
                <div className="flex gap-2">
                  <button
                    className="px-2 py-1 rounded-md border border-amber-300 text-xs font-semibold"
                    onClick={() => updateBinding(row.bindingId, "suspend")}
                  >
                    Suspend
                  </button>
                  <button
                    className="px-2 py-1 rounded-md border border-rose-300 text-xs font-semibold"
                    onClick={() => updateBinding(row.bindingId, "revoke")}
                  >
                    Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && <p className="text-sm text-amber-700">{error}</p>}
      </div>
    </AdminDashboardLayout>
  );
}
