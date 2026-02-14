"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import RegulatorDashboardLayout from "../../../../components/RegulatorDashboardLayout";
import { getSession } from "../../../../lib/store";

type RegulatorSliceResponse = {
  bindings: Array<{
    bindingIdMasked: string;
    status: string;
    createdAt: string;
    entityType: string;
    entityHash: string;
  }>;
  dispatches: Array<{
    dispatchIdMasked: string;
    bindingIdMasked: string;
    bodyHash: string;
    bodyLength: number;
    status: string;
    createdAt: string;
  }>;
  inbound: Array<{
    inboundIdMasked: string;
    bindingIdMasked: string;
    bodyHash: string;
    bodyLength: number;
    receivedAt: string;
    processed: boolean;
  }>;
  paging: {
    limit: number;
    page: number;
    bindingTotal: number;
    dispatchTotal: number;
    inboundTotal: number;
  };
  generatedAt: string;
};

export default function RegulatorWeChatGovernancePage() {
  const router = useRouter();
  const session = getSession();
  const [slice, setSlice] = useState<RegulatorSliceResponse | null>(null);
  const [status, setStatus] = useState<string>("Loading…");

  useEffect(() => {
    if (!session || session.role !== "regulator") {
      router.replace("/signin?role=regulator");
      return;
    }

    const run = async () => {
      const res = await fetch("/api/wechat/regulator-slice?limit=25&page=1");
      const json = await res.json();
      if (!res.ok) {
        setStatus(json?.error || "Unable to load WeChat overview");
        return;
      }
      setSlice(json);
      setStatus("Loaded");
    };

    run();
  }, [router, session]);

  return (
    <RegulatorDashboardLayout title="Regulator Evidence View — Hash First">
      <div className="buyer-card">
        <div className="buyer-card-header">
          <div>
            <div className="buyer-section-title">Read-only governance slice</div>
            <p className="text-sm text-muted">
              Hash-first, masked projection of WeChat master ledger evidence. No raw bodies, no mutation controls.
            </p>
          </div>
        </div>

        {!slice ? (
          <p className="text-sm text-muted">{status}</p>
        ) : (
          <div className="space-y-4 text-sm">
            <div>
              <strong>Generated:</strong> {new Date(slice.generatedAt).toISOString()}
            </div>
            <div>
              <strong>Bindings:</strong> {slice.paging.bindingTotal}
            </div>
            <div>
              <strong>Dispatches:</strong> {slice.paging.dispatchTotal}
            </div>
            <div>
              <strong>Inbound:</strong> {slice.paging.inboundTotal}
            </div>

            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wide text-muted">Binding Evidence (masked)</div>
              {slice.bindings.length === 0 ? (
                <div className="text-xs text-muted">No binding evidence rows.</div>
              ) : (
                <div className="space-y-2">
                  {slice.bindings.map((row) => (
                    <div key={`${row.bindingIdMasked}:${row.createdAt}`} className="rounded-md border p-2">
                      <div className="font-mono text-xs">binding={row.bindingIdMasked}</div>
                      <div className="text-xs">status={row.status}</div>
                      <div className="text-xs">entityType={row.entityType}</div>
                      <div className="font-mono text-xs break-all">entityHash={row.entityHash}</div>
                      <div className="text-xs text-muted">createdAt={new Date(row.createdAt).toISOString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wide text-muted">Dispatch Evidence (hash-first)</div>
              {slice.dispatches.length === 0 ? (
                <div className="text-xs text-muted">No dispatch evidence rows.</div>
              ) : (
                <div className="space-y-2">
                  {slice.dispatches.map((row) => (
                    <div key={`${row.dispatchIdMasked}:${row.createdAt}`} className="rounded-md border p-2">
                      <div className="font-mono text-xs">dispatch={row.dispatchIdMasked}</div>
                      <div className="font-mono text-xs">binding={row.bindingIdMasked}</div>
                      <div className="font-mono text-xs break-all">bodyHash={row.bodyHash}</div>
                      <div className="text-xs">bodyLength={row.bodyLength}</div>
                      <div className="text-xs">status={row.status}</div>
                      <div className="text-xs text-muted">createdAt={new Date(row.createdAt).toISOString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wide text-muted">Inbound Evidence (hash-first)</div>
              {slice.inbound.length === 0 ? (
                <div className="text-xs text-muted">No inbound evidence rows.</div>
              ) : (
                <div className="space-y-2">
                  {slice.inbound.map((row) => (
                    <div key={`${row.inboundIdMasked}:${row.receivedAt}`} className="rounded-md border p-2">
                      <div className="font-mono text-xs">inbound={row.inboundIdMasked}</div>
                      <div className="font-mono text-xs">binding={row.bindingIdMasked}</div>
                      <div className="font-mono text-xs break-all">bodyHash={row.bodyHash}</div>
                      <div className="text-xs">bodyLength={row.bodyLength}</div>
                      <div className="text-xs">processed={String(row.processed)}</div>
                      <div className="text-xs text-muted">receivedAt={new Date(row.receivedAt).toISOString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </RegulatorDashboardLayout>
  );
}
