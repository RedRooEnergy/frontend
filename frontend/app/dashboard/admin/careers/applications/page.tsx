"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { adminPhaseEnabled } from "../../../../../lib/featureFlags";
import type { CareerApplication } from "../../../../../lib/careers/types";
import { getAdminHeaders } from "../../../../../components/careers/admin/adminApi";

export default function AdminCareerApplicationsPage() {
  const enabled = adminPhaseEnabled();
  const [applications, setApplications] = useState<CareerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: "", role: "", search: "" });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/admin/careers/applications", { headers: getAdminHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        setApplications(data.applications || []);
      } finally {
        setLoading(false);
      }
    };
    if (enabled) load();
  }, [enabled]);

  const roles = useMemo(
    () => Array.from(new Set(applications.map((app) => app.roleOfInterest).filter(Boolean))),
    [applications]
  );

  const filtered = useMemo(() => {
    return applications.filter((app) => {
      if (filters.status && app.status !== filters.status) return false;
      if (filters.role && app.roleOfInterest !== filters.role) return false;
      if (
        filters.search &&
        !`${app.firstName} ${app.lastName} ${app.email}`.toLowerCase().includes(filters.search.toLowerCase())
      )
        return false;
      return true;
    });
  }, [applications, filters]);

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
        <h1 className="text-2xl font-bold">Career applications</h1>
        <div className="bg-surface rounded-2xl shadow-card border p-4 space-y-4">
          <div className="careers-admin-filter-grid">
            <input
              className="border rounded-md px-3 py-2"
              placeholder="Search name or email"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
            <select
              className="border rounded-md px-3 py-2"
              value={filters.role}
              onChange={(e) => setFilters({ ...filters, role: e.target.value })}
            >
              <option value="">Role</option>
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            <select
              className="border rounded-md px-3 py-2"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">Status</option>
              <option value="new">New</option>
              <option value="screening">Screening</option>
              <option value="interview">Interview</option>
              <option value="offer">Offer</option>
              <option value="hired">Hired</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        <div className="bg-surface rounded-2xl shadow-card border">
          <div className="grid grid-cols-5 text-xs font-semibold text-muted px-3 py-2 border-b">
            <span>Applicant</span>
            <span>Role</span>
            <span>Status</span>
            <span>Location</span>
            <span>Actions</span>
          </div>
          {loading && <div className="px-3 py-4 text-sm text-muted">Loading...</div>}
          {!loading &&
            filtered.map((app) => (
              <div key={app.id} className="grid grid-cols-5 text-sm px-3 py-3 border-b last:border-b-0">
                <span>
                  {app.firstName} {app.lastName}
                  <div className="text-xs text-muted">{app.email}</div>
                </span>
                <span>{app.roleOfInterest}</span>
                <span>{app.status}</span>
                <span className="text-xs text-muted">
                  {app.locationCity}, {app.locationCountry}
                </span>
                <div className="flex gap-2 text-xs">
                  <Link className="underline" href={`/dashboard/admin/careers/applications/${app.id}`}>
                    View
                  </Link>
                </div>
              </div>
            ))}
          {!loading && filtered.length === 0 && (
            <div className="px-3 py-4 text-sm text-muted">No applications found.</div>
          )}
        </div>
      </main>
    </div>
  );
}
