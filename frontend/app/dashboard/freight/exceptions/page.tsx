"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import FreightDashboardLayout from "../../../../components/FreightDashboardLayout";
import {
  addFreightException,
  FreightException,
  getFreightExceptions,
  getSession,
  updateFreightException,
} from "../../../../lib/store";
import { formatDate } from "../../../../lib/utils";

export default function FreightExceptionsPage() {
  const router = useRouter();
  const [exceptions, setExceptions] = useState<FreightException[]>([]);
  const [shipmentId, setShipmentId] = useState("");
  const [issueType, setIssueType] = useState<FreightException["issueType"]>("Delay");
  const [severity, setSeverity] = useState<FreightException["severity"]>("Medium");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const session = getSession();
    if (!session || session.role !== "freight") {
      router.replace("/signin?role=freight");
      return;
    }
    setExceptions(getFreightExceptions());
  }, [router]);

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault();
    if (!shipmentId.trim()) {
      setStatus("Shipment ID is required.");
      return;
    }
    const now = new Date().toISOString();
    const record: FreightException = {
      id: crypto.randomUUID(),
      shipmentId: shipmentId.trim(),
      issueType,
      severity,
      status: "OPEN",
      evidenceNote: note.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };
    addFreightException(record);
    setExceptions((prev) => [record, ...prev]);
    setShipmentId("");
    setIssueType("Delay");
    setSeverity("Medium");
    setNote("");
    setStatus("Exception recorded.");
  };

  const handleStatusChange = (id: string, nextStatus: FreightException["status"]) => {
    updateFreightException(id, { status: nextStatus });
    setExceptions((prev) => prev.map((e) => (e.id === id ? { ...e, status: nextStatus } : e)));
  };

  return (
    <FreightDashboardLayout title="Exceptions & Claims">
      <div className="buyer-card">
        <div className="buyer-card-header">
          <div className="buyer-section-title">Log an exception</div>
          <div className="text-xs text-muted">Delays, damage, loss, customs holds</div>
        </div>
        <form onSubmit={handleCreate} className="space-y-3">
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
              <label className="text-sm font-semibold">Issue type</label>
              <select
                className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2"
                value={issueType}
                onChange={(e) => setIssueType(e.target.value as FreightException["issueType"])}
              >
                <option value="Delay">Delay</option>
                <option value="Damage">Damage</option>
                <option value="Loss">Loss</option>
                <option value="Customs Hold">Customs Hold</option>
                <option value="Documentation">Documentation</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold">Severity</label>
              <select
                className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2"
                value={severity}
                onChange={(e) => setSeverity(e.target.value as FreightException["severity"])}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
            <div className="buyer-span-2">
              <label className="text-sm font-semibold">Evidence / notes</label>
              <textarea
                className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2 min-h-[120px]"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Describe the issue and attach evidence in the documents tab"
              />
            </div>
          </div>
          {status && <p className="text-sm text-muted">{status}</p>}
          <button className="px-4 py-2 rounded-md bg-brand-700 text-white font-semibold">Create exception</button>
        </form>
      </div>

      <div className="buyer-card">
        <div className="buyer-card-header">
          <div className="buyer-section-title">Active claims</div>
          <div className="text-xs text-muted">Escalation and resolution workflow</div>
        </div>
        {exceptions.length === 0 ? (
          <p className="text-sm text-muted">No exceptions recorded.</p>
        ) : (
          <div className="space-y-2">
            {exceptions.map((exception) => (
              <div key={exception.id} className="buyer-card">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">{exception.issueType}</div>
                    <div className="text-xs text-muted">Exception {exception.id}</div>
                    <div className="text-xs text-muted">Shipment {exception.shipmentId}</div>
                    <div className="text-xs text-muted">Severity: {exception.severity}</div>
                  </div>
                  <div className="text-right">
                    <span className="buyer-pill">{exception.status}</span>
                    <div className="text-xs text-muted">{formatDate(exception.createdAt)}</div>
                  </div>
                </div>
                {exception.evidenceNote && <div className="text-xs text-muted mt-2">{exception.evidenceNote}</div>}
                <div className="mt-3 flex gap-2">
                  {exception.status !== "RESOLVED" && (
                    <button
                      className="px-3 py-2 rounded-md border border-slate-200 text-sm font-semibold"
                      onClick={() => handleStatusChange(exception.id, "IN_REVIEW")}
                    >
                      Mark in review
                    </button>
                  )}
                  {exception.status !== "RESOLVED" && (
                    <button
                      className="px-3 py-2 rounded-md bg-brand-700 text-white text-sm font-semibold"
                      onClick={() => handleStatusChange(exception.id, "RESOLVED")}
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </FreightDashboardLayout>
  );
}
