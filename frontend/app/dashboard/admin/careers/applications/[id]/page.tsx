"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminPhaseEnabled } from "../../../../../../lib/featureFlags";
import type { CareerApplication } from "../../../../../../lib/careers/types";
import { getAdminHeaders } from "../../../../../../components/careers/admin/adminApi";

interface ApplicationDetail extends CareerApplication {
  attachments: Array<CareerApplication["attachments"][number] & { downloadUrl?: string }>;
}

export default function AdminCareerApplicationDetail({ params }: { params: { id: string } }) {
  const enabled = adminPhaseEnabled();
  const router = useRouter();
  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<CareerApplication["status"]>("new");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/admin/careers/applications/${params.id}`, { headers: getAdminHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        setApplication(data.application);
        setStatus(data.application.status);
      } finally {
        setLoading(false);
      }
    };
    if (enabled) load();
  }, [enabled, params.id]);

  const updateStatus = async () => {
    const res = await fetch(`/api/admin/careers/applications/${params.id}/status`, {
      method: "PUT",
      headers: getAdminHeaders(),
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const data = await res.json();
      setApplication(data.application);
    }
  };

  const addNote = async () => {
    if (!note.trim()) return;
    const res = await fetch(`/api/admin/careers/applications/${params.id}/notes`, {
      method: "POST",
      headers: getAdminHeaders(),
      body: JSON.stringify({ note }),
    });
    if (res.ok) {
      const data = await res.json();
      setApplication(data.application);
      setNote("");
    }
  };

  if (!enabled) {
    return (
      <div className="min-h-screen bg-surface-muted text-strong flex items-center justify-center">
        <div className="bg-surface rounded-2xl shadow-card border p-6 text-sm text-muted">
          Grand-Master phase disabled (NEXT_PUBLIC_ADMIN_PHASE).
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-muted text-strong flex items-center justify-center">
        <div className="text-sm text-muted">Loading application...</div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="min-h-screen bg-surface-muted text-strong flex items-center justify-center">
        <div className="text-sm text-muted">Application not found.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-muted text-strong">
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Application detail</h1>
          <button className="px-4 py-2 border rounded-md text-sm" onClick={() => router.back()}>
            Back
          </button>
        </div>

        <div className="careers-detail-layout">
          <div className="space-y-6">
            <section className="bg-surface rounded-2xl shadow-card border p-6 space-y-4">
              <div className="text-lg font-semibold">Applicant</div>
              <div className="text-base font-semibold">
                {application.firstName} {application.lastName}
              </div>
              <div className="text-sm text-muted">{application.email}</div>
              <div className="text-sm text-muted">
                {application.locationCity}, {application.locationCountry}
              </div>
              <div className="text-sm text-muted">Role: {application.roleOfInterest}</div>
              <div className="text-sm text-muted">Reference: {application.referenceId}</div>
            </section>

            <section className="bg-surface rounded-2xl shadow-card border p-6 space-y-4">
              <div className="text-lg font-semibold">Application details</div>
              <div className="text-sm text-muted">Work rights: {application.workRights}</div>
              <div className="text-sm text-muted">LinkedIn: {application.linkedinUrl || "-"}</div>
              <div className="text-sm text-muted">Portfolio: {application.portfolioUrl || "-"}</div>
              <div className="text-sm text-muted">Salary expectation: {application.salaryExpectation || "-"}</div>
              <div className="text-sm text-muted">Start date: {application.startDate || "-"}</div>
              <div className="text-sm text-muted">Source: {application.source || "-"}</div>
              <div className="text-sm text-muted">Cover letter: {application.coverLetterText || "-"}</div>
            </section>

            <section className="bg-surface rounded-2xl shadow-card border p-6 space-y-4">
              <div className="text-lg font-semibold">Attachments</div>
              {application.attachments.length === 0 && <div className="text-sm text-muted">No files uploaded.</div>}
              {application.attachments.map((att) => (
                <div key={att.storageKey} className="flex items-center justify-between text-sm">
                  <div>
                    <div className="font-semibold">{att.fileName}</div>
                    <div className="text-xs text-muted">{att.kind}</div>
                  </div>
                  {att.downloadUrl ? (
                    <a className="text-brand-700 text-sm" href={att.downloadUrl} target="_blank" rel="noreferrer">
                      Download
                    </a>
                  ) : (
                    <span className="text-xs text-muted">No link</span>
                  )}
                </div>
              ))}
            </section>

            <section className="bg-surface rounded-2xl shadow-card border p-6 space-y-4">
              <div className="text-lg font-semibold">Internal notes</div>
              <textarea
                className="w-full border rounded-md px-3 py-2"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <button className="px-4 py-2 bg-brand-700 text-brand-100 rounded-md text-sm" onClick={addNote}>
                Add note
              </button>
              <div className="careers-stack-sm">
                {application.adminNotes.map((item, idx) => (
                  <div key={`${item.createdAt}-${idx}`} className="text-sm text-muted border-t pt-2">
                    <div className="text-xs text-muted">{new Date(item.createdAt).toLocaleString()}</div>
                    {item.note}
                  </div>
                ))}
                {application.adminNotes.length === 0 && <div className="text-sm text-muted">No notes yet.</div>}
              </div>
            </section>
          </div>

          <aside className="careers-detail-sidebar">
            <div className="bg-surface rounded-2xl shadow-card border p-4 space-y-4">
              <div className="text-sm text-muted">Status</div>
              <select className="w-full border rounded-md px-3 py-2" value={status} onChange={(e) => setStatus(e.target.value as any)}>
                <option value="new">New</option>
                <option value="screening">Screening</option>
                <option value="interview">Interview</option>
                <option value="offer">Offer</option>
                <option value="hired">Hired</option>
                <option value="rejected">Rejected</option>
              </select>
              <button className="px-4 py-2 bg-brand-700 text-brand-100 rounded-md text-sm" onClick={updateStatus}>
                Update status
              </button>
              <div className="text-xs text-muted">Status history</div>
              <div className="careers-stack-sm text-xs text-muted">
                {application.statusHistory.map((entry) => (
                  <div key={`${entry.changedAt}-${entry.status}`}>
                    {entry.status} · {new Date(entry.changedAt).toLocaleString()}
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
