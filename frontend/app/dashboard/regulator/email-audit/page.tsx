"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import RegulatorDashboardLayout from "../../../../components/RegulatorDashboardLayout";
import { getSession } from "../../../../lib/store";

type ExportResponse = {
  manifest: { generatedAt: string; recordCount: number };
  manifestHash: string;
  jsonHash: string;
};

export default function RegulatorEmailAuditPage() {
  const router = useRouter();
  const session = getSession();
  const [status, setStatus] = useState<string | null>(null);
  const [exportData, setExportData] = useState<ExportResponse | null>(null);

  useEffect(() => {
    if (!session || session.role !== "regulator") {
      router.replace("/signin?role=regulator");
    }
  }, [router, session]);

  async function generateExport() {
    setStatus(null);
    const res = await fetch("/api/regulator/email-audit/export");
    if (!res.ok) {
      setStatus("Unable to generate email audit export.");
      return;
    }
    const data = (await res.json()) as ExportResponse;
    setExportData(data);
    setStatus("Email evidence export generated.");
  }

  return (
    <RegulatorDashboardLayout title="Email Evidence Exports">
      <div className="buyer-card">
        <div className="buyer-card-header">
          <div>
            <div className="buyer-section-title">Generate email evidence export</div>
            <p className="text-sm text-muted">Read-only export with manifest hashes.</p>
          </div>
        </div>
        <button className="px-4 py-2 rounded-md bg-brand-700 text-white font-semibold" onClick={generateExport}>
          Generate export
        </button>
        {status && <p className="text-sm text-muted mt-2">{status}</p>}
      </div>

      <div className="buyer-card">
        <div className="buyer-card-header">
          <div className="buyer-section-title">Latest export</div>
          <div className="text-xs text-muted">Manifest + hash verification</div>
        </div>
        {exportData ? (
          <div className="space-y-2 text-sm">
            <div>
              <strong>Generated:</strong> {new Date(exportData.manifest.generatedAt).toLocaleString()}
            </div>
            <div>
              <strong>Records:</strong> {exportData.manifest.recordCount}
            </div>
            <div className="text-xs">
              <strong>Manifest hash:</strong> {exportData.manifestHash}
            </div>
            <div className="text-xs">
              <strong>JSON hash:</strong> {exportData.jsonHash}
            </div>
            <div className="flex gap-3">
              <a className="underline" href="/api/regulator/email-audit/export">
                Download JSON
              </a>
              <a className="underline" href="/api/regulator/email-audit/export?format=pdf">
                Download PDF
              </a>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">No exports generated yet.</p>
        )}
      </div>
    </RegulatorDashboardLayout>
  );
}
