"use client";

import { useEffect, useState } from "react";
import { getAdminAuthHeaders } from "../../../lib/auth/clientAdminHeaders";
import ReportArtifactsTable from "./_components/ReportArtifactsTable";
import ReportCatalog from "./_components/ReportCatalog";
import ReportGenerator from "./_components/ReportGenerator";

export default function AdminReportsPage() {
  const [backendAvailable, setBackendAvailable] = useState(false);

  useEffect(() => {
    let active = true;
    async function probe() {
      try {
        const response = await fetch("/api/admin/dashboard/reports/catalog", {
          method: "GET",
          headers: getAdminAuthHeaders(),
          cache: "no-store",
        });
        if (!active) return;
        setBackendAvailable(response.ok);
      } catch {
        if (!active) return;
        setBackendAvailable(false);
      }
    }

    probe();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-xl font-semibold text-slate-900">Reports</h2>
        <p className="text-sm text-slate-600">Read-only scaffolding in B5. Report generation is intentionally disabled until backend wiring exists.</p>
      </header>
      <div className="grid gap-4 lg:grid-cols-2">
        <ReportCatalog backendAvailable={backendAvailable} />
        <ReportGenerator backendAvailable={backendAvailable} />
      </div>
      <ReportArtifactsTable backendAvailable={backendAvailable} />
    </div>
  );
}
