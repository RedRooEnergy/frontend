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

type RegulatorExportAuditResponse = {
  items: Array<{
    eventIdMasked: string;
    requestedAt: string;
    format: "zip" | "json";
    scope: {
      bindingId: string | null;
      limit: number;
      page: number;
    };
    manifestSha256: string;
    canonicalHashSha256: string;
  }>;
  paging: {
    limit: number;
    page: number;
    total: number;
  };
  generatedAt: string;
};

export default function RegulatorWeChatGovernancePage() {
  const router = useRouter();
  const session = getSession();
  const [slice, setSlice] = useState<RegulatorSliceResponse | null>(null);
  const [audit, setAudit] = useState<RegulatorExportAuditResponse | null>(null);
  const [status, setStatus] = useState<string>("Loading…");

  useEffect(() => {
    if (!session || session.role !== "regulator") {
      router.replace("/signin?role=regulator");
      return;
    }

    const run = async () => {
      const [sliceRes, auditRes] = await Promise.all([
        fetch("/api/wechat/regulator-slice?limit=25&page=1"),
        fetch("/api/wechat/regulator-export-audit?limit=25&page=1"),
      ]);

      const [sliceJson, auditJson] = await Promise.all([sliceRes.json(), auditRes.json()]);

      if (!sliceRes.ok) {
        setStatus(sliceJson?.error || "Unable to load WeChat regulator slice");
        return;
      }
      if (!auditRes.ok) {
        setStatus(auditJson?.error || "Unable to load WeChat export audit log");
        return;
      }

      setSlice(sliceJson);
      setAudit(auditJson);
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

      <div className="buyer-card">
        <div className="buyer-card-header">
          <div>
            <div className="buyer-section-title">Download Export Pack</div>
            <p className="text-sm text-muted">
              ZIP contains <span className="font-mono">slice.json</span> + <span className="font-mono">manifest.json</span> +
              <span className="font-mono"> manifest.sha256.txt</span> + <span className="font-mono">README.txt</span> for
              verification.
            </p>
          </div>
        </div>
        <a
          href="/api/wechat/regulator-export-pack?limit=25&page=1"
          className="inline-flex items-center rounded-md border border-brand-600 bg-brand-700 px-4 py-2 text-sm font-semibold text-brand-100"
        >
          Download Export Pack
        </a>
      </div>

      <div className="buyer-card">
        <div className="buyer-card-header">
          <div>
            <div className="buyer-section-title">Export Audit Log</div>
            <p className="text-sm text-muted">
              Read-only chain-of-custody events for regulator export requests.
            </p>
          </div>
        </div>
        {!audit ? (
          <p className="text-sm text-muted">{status === "Loaded" ? "No export audit log loaded." : status}</p>
        ) : (
          <div className="space-y-3 text-sm">
            <div>
              <strong>Total Events:</strong> {audit.paging.total}
            </div>
            <div>
              <strong>Generated:</strong> {new Date(audit.generatedAt).toISOString()}
            </div>
            {audit.items.length === 0 ? (
              <div className="text-xs text-muted">No export audit events.</div>
            ) : (
              <div className="space-y-2">
                {audit.items.map((row) => (
                  <div key={`${row.eventIdMasked}:${row.requestedAt}`} className="rounded-md border p-2">
                    <div className="font-mono text-xs">event={row.eventIdMasked}</div>
                    <div className="text-xs">format={row.format}</div>
                    <div className="text-xs">
                      scope: bindingId={row.scope.bindingId || "null"}, limit={row.scope.limit}, page={row.scope.page}
                    </div>
                    <div className="font-mono text-xs break-all">manifestSha256={row.manifestSha256}</div>
                    <div className="font-mono text-xs break-all">canonicalHashSha256={row.canonicalHashSha256}</div>
                    <div className="text-xs text-muted">requestedAt={new Date(row.requestedAt).toISOString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </RegulatorDashboardLayout>
  );
}
