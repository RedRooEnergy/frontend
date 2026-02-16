"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "../../../../lib/store";
import { formatDate } from "../../../../lib/utils";

type BindingRow = {
  bindingId: string;
  status: "PENDING" | "VERIFIED" | "SUSPENDED" | "REVOKED";
  wechatAppId: string;
  wechatUserId?: string | null;
  verificationTokenExpiresAt?: string | null;
  verifiedAt?: string | null;
  updatedAt: string;
};

export default function SupplierWeChatPage() {
  const router = useRouter();
  const session = getSession();
  const [rows, setRows] = useState<BindingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationLink, setVerificationLink] = useState<string>("");

  useEffect(() => {
    if (!session || session.role !== "supplier") {
      router.replace("/signin?role=supplier");
      return;
    }

    const run = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/wechat/bindings/status");
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Unable to load WeChat status");
        setRows(json.items || []);
        setError(null);
      } catch (err: any) {
        setError(err?.message || "Unable to load WeChat status");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [router, session]);

  async function startBinding() {
    try {
      setStarting(true);
      const res = await fetch("/api/wechat/bindings/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ verificationMethod: "QR_LINK" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Unable to start WeChat binding");
      setVerificationLink(json?.verification?.verificationLink || "");
      const statusRes = await fetch("/api/wechat/bindings/status");
      const statusJson = await statusRes.json();
      setRows(statusJson.items || []);
      setError(null);
    } catch (err: any) {
      setError(err?.message || "Unable to start WeChat binding");
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">WeChat Channel</h1>
        <p className="text-sm text-muted">Connect your supplier account to receive governed operational prompts.</p>
      </div>

      <div className="bg-surface rounded-2xl shadow-card border p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-base font-semibold">Binding Status</div>
            <p className="text-xs text-muted">Operational actions remain authoritative only inside RRE.</p>
          </div>
          <button
            className="px-3 py-2 rounded-md bg-brand-700 text-white text-sm font-semibold disabled:opacity-60"
            disabled={starting}
            onClick={startBinding}
          >
            {starting ? "Starting…" : "Connect WeChat"}
          </button>
        </div>

        {verificationLink && (
          <div className="text-sm border border-emerald-200 bg-emerald-50 rounded-md p-3">
            Verification link generated:
            <div className="break-all text-xs mt-1">{verificationLink}</div>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted">Loading binding status…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted">No binding yet.</p>
        ) : (
          <div className="buyer-table">
            <div className="buyer-table-header">
              <div>Binding</div>
              <div>Status</div>
              <div>WeChat User</div>
              <div>Updated</div>
            </div>
            {rows.map((row) => (
              <div key={row.bindingId} className="buyer-table-row">
                <div className="text-xs break-all">{row.bindingId}</div>
                <div className="text-xs">{row.status}</div>
                <div className="text-xs">{row.wechatUserId || "—"}</div>
                <div className="text-xs">{formatDate(row.updatedAt)}</div>
              </div>
            ))}
          </div>
        )}

        {error && <p className="text-sm text-amber-700">{error}</p>}
      </div>
    </div>
  );
}
