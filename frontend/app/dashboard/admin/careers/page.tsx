"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { adminPhaseEnabled } from "../../../../lib/featureFlags";
import { CAREER_LOCATIONS, CAREER_TEAMS } from "../../../../data/careersConstants";
import type { CareerJob } from "../../../../lib/careers/types";
import { getAdminHeaders } from "../../../../components/careers/admin/adminApi";

interface AdminJob extends CareerJob {
  applicants?: number;
}

export default function AdminCareersPage() {
  const enabled = adminPhaseEnabled();
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: "", team: "", status: "", location: "" });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/admin/careers/jobs", { headers: getAdminHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        setJobs(data.jobs || []);
      } finally {
        setLoading(false);
      }
    };
    if (enabled) load();
  }, [enabled]);

  const filtered = useMemo(() => {
    return jobs.filter((job) => {
      if (filters.search && !job.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters.team && job.team !== filters.team) return false;
      if (filters.status && job.status !== filters.status) return false;
      if (filters.location && !job.locations.includes(filters.location)) return false;
      return true;
    });
  }, [jobs, filters]);

  const closeJob = async (id: string) => {
    const res = await fetch(`/api/admin/careers/jobs/${id}/close`, {
      method: "POST",
      headers: getAdminHeaders(),
    });
    if (!res.ok) return;
    const data = await res.json();
    setJobs((prev) => prev.map((job) => (job.id === id ? data.job : job)));
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

  return (
    <div className="min-h-screen bg-surface-muted text-strong">
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Careers</h1>
            <p className="text-sm text-muted">Manage job listings and publishing status.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard/admin/careers/applications" className="px-4 py-2 border rounded-md text-sm">
              View applications
            </Link>
            <Link href="/dashboard/admin/careers/new" className="px-4 py-2 bg-brand-700 text-brand-100 rounded-md font-semibold">
              Create role
            </Link>
          </div>
        </div>

        <div className="bg-surface rounded-2xl shadow-card border p-4 space-y-4">
          <div className="careers-admin-filter-grid">
            <input
              className="border rounded-md px-3 py-2"
              placeholder="Search title"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
            <select
              className="border rounded-md px-3 py-2"
              value={filters.team}
              onChange={(e) => setFilters({ ...filters, team: e.target.value })}
            >
              <option value="">Team</option>
              {CAREER_TEAMS.map((team) => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </select>
            <select
              className="border rounded-md px-3 py-2"
              value={filters.location}
              onChange={(e) => setFilters({ ...filters, location: e.target.value })}
            >
              <option value="">Location</option>
              {CAREER_LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
            <select
              className="border rounded-md px-3 py-2"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">Status</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        <div className="bg-surface rounded-2xl shadow-card border">
          <div className="grid grid-cols-6 text-xs font-semibold text-muted px-3 py-2 border-b">
            <span>Title</span>
            <span>Team</span>
            <span>Location</span>
            <span>Status</span>
            <span>Applicants</span>
            <span>Actions</span>
          </div>
          {loading && <div className="px-3 py-4 text-sm text-muted">Loading...</div>}
          {!loading &&
            filtered.map((job) => (
              <div key={job.id} className="grid grid-cols-6 text-sm px-3 py-3 border-b last:border-b-0">
                <span>{job.title}</span>
                <span>{job.team}</span>
                <span className="text-xs text-muted">{job.locations.join(", ")}</span>
                <span>{job.status}</span>
                <span>{job.applicants || 0}</span>
                <div className="flex gap-2 text-xs">
                  <Link className="underline" href={`/dashboard/admin/careers/${job.id}/edit`}>
                    Edit
                  </Link>
                  <Link className="underline" href={`/careers/${job.slug}`} target="_blank">
                    View
                  </Link>
                  {job.status !== "closed" && (
                    <button className="underline" onClick={() => closeJob(job.id)}>
                      Close
                    </button>
                  )}
                </div>
              </div>
            ))}
          {!loading && filtered.length === 0 && (
            <div className="px-3 py-4 text-sm text-muted">No roles found.</div>
          )}
        </div>
      </main>
    </div>
  );
}
