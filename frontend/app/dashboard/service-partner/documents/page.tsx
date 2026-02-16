"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ServicePartnerDashboardLayout from "../../../../components/ServicePartnerDashboardLayout";
import {
  addServicePartnerDocument,
  getServicePartnerDocuments,
  getSession,
  removeServicePartnerDocument,
  ServicePartnerDocument,
} from "../../../../lib/store";
import { formatDate } from "../../../../lib/utils";

export default function ServicePartnerDocumentsPage() {
  const router = useRouter();
  const [docs, setDocs] = useState<ServicePartnerDocument[]>([]);
  const [taskId, setTaskId] = useState("");
  const [docType, setDocType] = useState("Inspection Report");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const session = getSession();
    if (!session || session.role !== "service-partner") {
      router.replace("/signin?role=service-partner");
      return;
    }
    const existing = getServicePartnerDocuments().filter((d) => d.servicePartnerId === session.userId);
    setDocs(existing);
  }, [router]);

  const handleUpload = (event: React.FormEvent) => {
    event.preventDefault();
    const session = getSession();
    if (!session?.userId) return;
    if (!file) {
      setStatus("Select a file to upload.");
      return;
    }
    const newDoc: ServicePartnerDocument = {
      id: crypto.randomUUID(),
      servicePartnerId: session.userId,
      taskId: taskId.trim() || undefined,
      name: file.name,
      type: docType,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    };
    addServicePartnerDocument(newDoc);
    setDocs((prev) => [newDoc, ...prev]);
    setFile(null);
    setTaskId("");
    setDocType("Inspection Report");
    setStatus("Evidence recorded.");
  };

  const handleRemove = (id: string) => {
    removeServicePartnerDocument(id);
    setDocs((prev) => prev.filter((d) => d.id !== id));
  };

  return (
    <ServicePartnerDashboardLayout title="Documents & Evidence">
      <div className="buyer-card">
        <div className="buyer-card-header">
          <div className="buyer-section-title">Upload evidence</div>
          <div className="text-xs text-muted">Stored as audit artefacts</div>
        </div>
        <form onSubmit={handleUpload} className="space-y-3">
          <div className="buyer-form-grid">
            <div>
              <label className="text-sm font-semibold">Linked task ID</label>
              <input
                className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2"
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Document type</label>
              <select
                className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2"
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
              >
                <option>Inspection Report</option>
                <option>Compliance Certificate</option>
                <option>Photo Evidence</option>
                <option>Completion Sign-off</option>
              </select>
            </div>
            <div className="buyer-span-2">
              <label className="text-sm font-semibold">Upload file</label>
              <input
                type="file"
                className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
          {status && <p className="text-sm text-muted">{status}</p>}
          <button className="px-4 py-2 rounded-md bg-brand-700 text-white font-semibold">Record evidence</button>
        </form>
      </div>

      <div className="buyer-card">
        <div className="buyer-card-header">
          <div className="buyer-section-title">Evidence library</div>
          <div className="text-xs text-muted">Read-only archive</div>
        </div>
        {docs.length === 0 ? (
          <p className="text-sm text-muted">No evidence uploaded yet.</p>
        ) : (
          <div className="space-y-2">
            {docs.map((doc) => (
              <div key={doc.id} className="buyer-card flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">{doc.name}</div>
                  <div className="text-xs text-muted">
                    {doc.type} · {doc.taskId ? `Task ${doc.taskId}` : "Unlinked"}
                  </div>
                  <div className="text-xs text-muted">Uploaded {formatDate(doc.uploadedAt)}</div>
                </div>
                <button
                  className="text-xs font-semibold text-red-600"
                  onClick={() => handleRemove(doc.id)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </ServicePartnerDashboardLayout>
  );
}
