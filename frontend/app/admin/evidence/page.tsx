"use client";

import { useEffect, useState } from "react";
import { getAdminAuthHeaders } from "../../../lib/auth/clientAdminHeaders";
import ArtifactDownloads from "./_components/ArtifactDownloads";
import EvidencePackBuilder from "./_components/EvidencePackBuilder";
import HashVerifyPanel from "./_components/HashVerifyPanel";

export default function AdminEvidencePage() {
  const [backendAvailable, setBackendAvailable] = useState(false);

  useEffect(() => {
    let active = true;

    async function probe() {
      try {
        const response = await fetch("/api/admin/dashboard/evidence/packs", {
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
        <h2 className="text-xl font-semibold text-slate-900">Evidence</h2>
        <p className="text-sm text-slate-600">Read-only scaffolding in B5. Evidence generation stays disabled until backend routes exist.</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <EvidencePackBuilder backendAvailable={backendAvailable} />
        <ArtifactDownloads backendAvailable={backendAvailable} />
      </div>

      <HashVerifyPanel />
    </div>
  );
}
