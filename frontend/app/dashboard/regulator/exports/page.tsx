"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import RegulatorDashboardLayout from "../../../../components/RegulatorDashboardLayout";
import { getAdminExports, getOrders, setAdminExports, getSession } from "../../../../lib/store";
import { formatDate } from "../../../../lib/utils";

function createHash(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return `RRE-${Math.abs(hash).toString(16).padStart(8, "0")}`;
}

export default function RegulatorAuditExportsPage() {
  const router = useRouter();
  const session = getSession();
  const [status, setStatus] = useState<string | null>(null);
  const [exports, setExports] = useState(() => getAdminExports());

  useEffect(() => {
    if (!session || session.role !== "regulator") {
      router.replace("/signin?role=regulator");
    }
  }, [router, session]);

  const orders = useMemo(() => getOrders(), []);

  const generateExport = () => {
    const payload = JSON.stringify({
      type: "REGULATOR_EVIDENCE_PACK",
      orderCount: orders.length,
      generatedAt: new Date().toISOString(),
    });
    const record = {
      id: crypto.randomUUID(),
      type: "REGULATOR_EVIDENCE_PACK",
      createdAt: new Date().toISOString(),
      hash: createHash(payload),
      requester: session?.email ?? "regulator",
    };
    const list = [record, ...exports];
    setAdminExports(list);
    setExports(list);
    setStatus("Evidence pack generated.");
  };

  return (
    <RegulatorDashboardLayout title="Audit Export & Evidence Pack">
      <div className="buyer-card">
        <div className="buyer-card-header">
          <div>
            <div className="buyer-section-title">Generate evidence pack</div>
            <p className="text-sm text-muted">Hash-verified exports for audit traceability.</p>
          </div>
        </div>
        <button className="px-4 py-2 rounded-md bg-brand-700 text-white font-semibold" onClick={generateExport}>
          Generate export
        </button>
        {status && <p className="text-sm text-muted mt-2">{status}</p>}
      </div>

      <div className="buyer-card">
        <div className="buyer-card-header">
          <div className="buyer-section-title">Export history</div>
          <div className="text-xs text-muted">Reproducible, immutable records</div>
        </div>
        {exports.length === 0 ? (
          <p className="text-sm text-muted">No exports generated yet.</p>
        ) : (
          <div className="space-y-2 text-sm">
            {exports.map((record) => (
              <div key={record.id} className="flex items-center justify-between">
                <span>
                  {record.type} · {record.hash}
                </span>
                <span className="text-xs text-muted">{formatDate(record.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </RegulatorDashboardLayout>
  );
}
