"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminPhaseEnabled } from "../../../../../../lib/featureFlags";
import JobForm from "../../../../../../components/careers/admin/JobForm";
import { getAdminHeaders } from "../../../../../../components/careers/admin/adminApi";
import type { CareerJob } from "../../../../../../lib/careers/types";

export default function AdminCareersEditPage({ params }: { params: { id: string } }) {
  const enabled = adminPhaseEnabled();
  const router = useRouter();
  const [job, setJob] = useState<CareerJob | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/admin/careers/jobs/${params.id}`, { headers: getAdminHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        setJob(data.job);
      } finally {
        setLoading(false);
      }
    };
    if (enabled) load();
  }, [enabled, params.id]);

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
        <div className="text-sm text-muted">Loading role...</div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-surface-muted text-strong flex items-center justify-center">
        <div className="text-sm text-muted">Role not found.</div>
      </div>
    );
  }

  const handleSubmit = async (payload: Partial<CareerJob>) => {
    const res = await fetch(`/api/admin/careers/jobs/${job.id}`, {
      method: "PUT",
      headers: getAdminHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Unable to update role");
    const data = await res.json();
    setJob(data.job);
  };

  return (
    <div className="min-h-screen bg-surface-muted text-strong">
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Edit role</h1>
          <button
            className="px-4 py-2 border rounded-md text-sm"
            onClick={() => router.push("/dashboard/admin/careers")}
          >
            Back to list
          </button>
        </div>
        <JobForm initial={job} onSubmit={handleSubmit} submitLabel="Save changes" />
      </main>
    </div>
  );
}
