"use client";

import { useRouter } from "next/navigation";
import { adminPhaseEnabled } from "../../../../../lib/featureFlags";
import JobForm from "../../../../../components/careers/admin/JobForm";
import { getAdminHeaders } from "../../../../../components/careers/admin/adminApi";

export default function AdminCareersNewPage() {
  const enabled = adminPhaseEnabled();
  const router = useRouter();

  if (!enabled) {
    return (
      <div className="min-h-screen bg-surface-muted text-strong flex items-center justify-center">
        <div className="bg-surface rounded-2xl shadow-card border p-6 text-sm text-muted">
          Grand-Master phase disabled (NEXT_PUBLIC_ADMIN_PHASE).
        </div>
      </div>
    );
  }

  const handleSubmit = async (payload: any) => {
    const res = await fetch("/api/admin/careers/jobs", {
      method: "POST",
      headers: getAdminHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error("Unable to create job");
    }
    const data = await res.json();
    router.push(`/dashboard/admin/careers/${data.job.id}/edit`);
  };

  return (
    <div className="min-h-screen bg-surface-muted text-strong">
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-4">
        <h1 className="text-2xl font-bold">Create role</h1>
        <JobForm onSubmit={handleSubmit} submitLabel="Create role" />
      </main>
    </div>
  );
}
