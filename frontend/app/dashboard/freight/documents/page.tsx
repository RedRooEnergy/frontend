"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import FreightDashboardLayout from "../../../../components/FreightDashboardLayout";
import {
  addFreightDocument,
  FreightDocument,
  getFreightDocuments,
  getSession,
} from "../../../../lib/store";
import { formatDate } from "../../../../lib/utils";

const docTypes: FreightDocument["type"][] = ["B/L", "AWB", "Invoice", "Packing List", "Proof of Delivery"];

export default function FreightDocumentsPage() {
  const router = useRouter();
  const [docs, setDocs] = useState<FreightDocument[]>([]);
  const [shipmentId, setShipmentId] = useState("");
  const [docType, setDocType] = useState<FreightDocument["type"]>("B/L");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const session = getSession();
    if (!session || session.role !== "freight") {
      router.replace("/signin?role=freight");
      return;
    }
    setDocs(getFreightDocuments());
  }, [router]);

  const handleUpload = (event: React.FormEvent) => {
    event.preventDefault();
    if (!file || !shipmentId.trim()) {
      setStatus("Shipment ID and file are required.");
      return;
    }
    const newDoc: FreightDocument = {
      id: crypto.randomUUID(),
      shipmentId: shipmentId.trim(),
      name: file.name,
      type: docType,
      uploadedAt: new Date().toISOString(),
    };
    addFreightDocument(newDoc);
    setDocs((prev) => [newDoc, ...prev]);
    setFile(null);
    setShipmentId("");
    setDocType("B/L");
    setStatus("Document recorded.");
  };

  return (
    <FreightDashboardLayout title="Freight Documents">
      <div className="buyer-card">
        <div className="buyer-card-header">
          <div className="buyer-section-title">Record freight documents</div>
          <div className="text-xs text-muted">B/L, AWB, invoices, packing lists, POD</div>
        </div>
        <form onSubmit={handleUpload} className="space-y-3">
          <div className="buyer-form-grid">
            <div>
              <label className="text-sm font-semibold">Shipment ID *</label>
              <input
                className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2"
                value={shipmentId}
                onChange={(e) => setShipmentId(e.target.value)}
                placeholder="TRK-7781"
                required
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Document type</label>
              <select
                className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2"
                value={docType}
                onChange={(e) => setDocType(e.target.value as FreightDocument["type"])}
              >
                {docTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
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
          <button className="px-4 py-2 rounded-md bg-brand-700 text-white font-semibold">Record document</button>
        </form>
      </div>

      <div className="buyer-card">
        <div className="buyer-card-header">
          <div className="buyer-section-title">Document register</div>
          <div className="text-xs text-muted">Immutable records</div>
        </div>
        {docs.length === 0 ? (
          <p className="text-sm text-muted">No freight documents yet.</p>
        ) : (
          <div className="space-y-2">
            {docs.map((doc) => (
              <div key={doc.id} className="buyer-card flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">{doc.name}</div>
                  <div className="text-xs text-muted">
                    {doc.type} · Shipment {doc.shipmentId}
                  </div>
                  <div className="text-xs text-muted">Uploaded {formatDate(doc.uploadedAt)}</div>
                </div>
                <span className="text-xs font-semibold text-slate-500">Locked</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </FreightDashboardLayout>
  );
}
