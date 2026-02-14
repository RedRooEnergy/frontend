"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BuyerDashboardLayout from "../../../../components/BuyerDashboardLayout";
import { getClientRoleHeaders } from "../../../../lib/auth/clientRoleHeaders";
import { getSession } from "../../../../lib/store";

type BindingStatus = "NONE" | "PENDING" | "VERIFIED" | "REVOKED" | "ERROR";

type ChannelStatusResponse = {
  bindingStatus: BindingStatus;
  unreadCount: number;
  lastInboundAt: string | null;
  bindingId: string | null;
};

function formatIso(iso: string | null) {
  if (!iso) return "-";
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return iso;
  return value.toISOString();
}

export default function BuyerCommunicationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = getSession();

  const [status, setStatus] = useState<ChannelStatusResponse>({
    bindingStatus: "NONE",
    unreadCount: 0,
    lastInboundAt: null,
    bindingId: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session || session.role !== "buyer") {
      router.replace("/signin?role=buyer");
    }
  }, [router, session]);

  useEffect(() => {
    let active = true;

    async function loadStatus() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch("/api/wechat/channel-status", {
          method: "GET",
          headers: getClientRoleHeaders("buyer"),
          cache: "no-store",
        });
        const json = await response.json().catch(() => ({}));
        if (!active) return;
        if (!response.ok) {
          throw new Error(String(json?.error || "Unable to load channel status"));
        }
        setStatus({
          bindingStatus: (json?.bindingStatus as BindingStatus) || "NONE",
          unreadCount: Number(json?.unreadCount || 0),
          lastInboundAt: json?.lastInboundAt || null,
          bindingId: json?.bindingId || null,
        });
      } catch (err: any) {
        if (!active) return;
        setError(String(err?.message || err));
      } finally {
        if (active) setLoading(false);
      }
    }

    loadStatus();
    return () => {
      active = false;
    };
  }, []);

  const correlationEntries = useMemo(() => {
    const keys = ["channel", "supplierId", "productId", "orderId", "paymentId", "shipmentId", "complianceCaseId", "governanceCaseId"];
    return keys
      .map((key) => ({ key, value: searchParams.get(key) || "" }))
      .filter((entry) => entry.value);
  }, [searchParams]);

  const inboundEvidence = useMemo(() => {
    if (!status.lastInboundAt) return [] as Array<{ id: string; receivedAt: string; note: string }>;
    return [
      {
        id: status.bindingId || "binding-unresolved",
        receivedAt: status.lastInboundAt,
        note: "Latest inbound evidence for actor binding (read-only slice)",
      },
    ];
  }, [status.bindingId, status.lastInboundAt]);

  return (
    <BuyerDashboardLayout title="Communications Center">
      <div className="buyer-card space-y-2">
        <div className="buyer-card-header">
          <div className="buyer-section-title">Correlation Context</div>
          <div className="text-xs text-muted">Read-only context for governed channel review</div>
        </div>
        {correlationEntries.length === 0 ? (
          <p className="text-sm text-muted">No correlation query parameters supplied.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
            {correlationEntries.map((entry) => (
              <div key={entry.key} className="rounded-md border border-brand-200 bg-brand-100 px-3 py-2">
                <div className="text-xs uppercase tracking-wide text-muted">{entry.key}</div>
                <div className="font-semibold text-strong">{entry.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="buyer-card space-y-2">
        <div className="buyer-card-header">
          <div className="buyer-section-title">WeChat Channel Status</div>
          <div className="text-xs text-muted">Binding-aware and read-only</div>
        </div>
        {loading ? <p className="text-sm text-muted">Loading channel status…</p> : null}
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {!loading && !error ? (
          <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted">Binding status</div>
              <div className="font-semibold text-strong">{status.bindingStatus}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted">Unread count</div>
              <div className="font-semibold text-strong">{status.unreadCount}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted">Last inbound at</div>
              <div className="font-semibold text-strong">{formatIso(status.lastInboundAt)}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted">Binding id</div>
              <div className="font-mono text-xs text-muted">{status.bindingId || "-"}</div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="buyer-card space-y-2">
        <div className="buyer-card-header">
          <div className="buyer-section-title">Inbound Evidence (Read-only)</div>
          <div className="text-xs text-muted">Master WeChat ledger derived</div>
        </div>
        {inboundEvidence.length === 0 ? (
          <p className="text-sm text-muted">No inbound evidence rows in current actor slice.</p>
        ) : (
          <div className="space-y-2 text-sm">
            {inboundEvidence.map((row) => (
              <div key={`${row.id}:${row.receivedAt}`} className="rounded-md border px-3 py-2">
                <div className="text-xs text-muted">{row.note}</div>
                <div className="font-mono text-xs">binding={row.id}</div>
                <div className="text-xs">receivedAt={formatIso(row.receivedAt)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="buyer-card space-y-2">
        <div className="buyer-card-header">
          <div className="buyer-section-title">Outbound Evidence (Read-only)</div>
          <div className="text-xs text-muted">No send controls in this phase</div>
        </div>
        <p className="text-sm text-muted">
          Outbound evidence remains governed by dispatch ledgers and appears in role-permitted views only. This surface is
          correlation-bound and does not send, retry, or mutate any messages.
        </p>
      </div>
    </BuyerDashboardLayout>
  );
}
