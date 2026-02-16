"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminDashboardLayout from "../../../../components/AdminDashboardLayout";
import { getSession, ServicePartnerComplianceProfile } from "../../../../lib/store";
import { formatDate } from "../../../../lib/utils";
import { getAdminAuthHeaders } from "../../../../lib/auth/clientAdminHeaders";

export default function AdminServicePartnerCompliancePage() {
  const router = useRouter();
  const session = getSession();

  useEffect(() => {
    if (!session || session.role !== "admin") {
      router.replace("/signin?role=admin");
    }
  }, [router, session]);

  const [profiles, setProfiles] = useState<ServicePartnerComplianceProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [engagementSummary, setEngagementSummary] = useState<any | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summaryFilters, setSummaryFilters] = useState({
    sourceType: "",
    engagementType: "",
    startDate: "",
    endDate: "",
  });

  const refreshList = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/service-partners", {
        credentials: "include",
        headers: getAdminAuthHeaders(),
      });
      if (!response.ok) throw new Error("Unable to load profiles.");
      const json = await response.json();
      setProfiles(json.profiles ?? []);
      setError(null);
    } catch (err) {
      setError("Unable to load service partner profiles.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadEngagementSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const params = new URLSearchParams();
      if (summaryFilters.sourceType) params.set("sourceType", summaryFilters.sourceType);
      if (summaryFilters.engagementType) params.set("engagementType", summaryFilters.engagementType);
      if (summaryFilters.startDate) params.set("startDate", summaryFilters.startDate);
      if (summaryFilters.endDate) params.set("endDate", summaryFilters.endDate);
      const response = await fetch(`/api/admin/connection-events/summary?${params.toString()}`, {
        credentials: "include",
        headers: getAdminAuthHeaders(),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json?.error || "Unable to load engagement summary.");
      setEngagementSummary(json.summary);
    } catch (err) {
      setSummaryError("Unable to load engagement summary.");
    } finally {
      setSummaryLoading(false);
    }
  }, [summaryFilters]);

  useEffect(() => {
    if (session?.role === "admin") {
      refreshList();
      loadEngagementSummary();
    }
  }, [session, refreshList, loadEngagementSummary]);

  return (
    <AdminDashboardLayout title="Service Partner Compliance Review">
      <div className="buyer-card">
        <div className="buyer-card-header">
          <div>
            <div className="buyer-section-title">Accreditation review queue</div>
            <p className="text-sm text-muted">Approve, request changes, or suspend partners.</p>
          </div>
          <button
            className="px-3 py-2 rounded-md border border-slate-200 text-sm font-semibold"
            onClick={refreshList}
          >
            Refresh
          </button>
        </div>
        {loading ? (
          <p className="text-sm text-muted">Loading profiles…</p>
        ) : profiles.length === 0 ? (
          <p className="text-sm text-muted">No compliance partner profiles yet.</p>
        ) : (
          <div className="buyer-table">
            <div className="buyer-table-header">
              <div>Partner</div>
              <div>Status</div>
              <div>Jurisdictions</div>
              <div>Last updated</div>
              <div>Action</div>
            </div>
            {profiles.map((profile) => (
              <div key={profile.partnerId} className="buyer-table-row">
                <div>
                  <div className="text-sm font-semibold">{profile.identity.legalName || "Unnamed partner"}</div>
                  <div className="text-xs text-muted">{profile.partnerId}</div>
                </div>
                <div className="text-sm">{profile.status.replace(/_/g, " ")}</div>
                <div className="text-xs text-muted">{profile.identity.jurisdictions || "—"}</div>
                <div className="text-xs text-muted">{formatDate(profile.updatedAt)}</div>
                <div>
                  <Link
                    href={`/dashboard/admin/service-partners/${profile.partnerId}`}
                    className="text-sm font-semibold text-brand-700"
                  >
                    Review
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
        {error && <p className="text-sm text-amber-700 mt-3">{error}</p>}
      </div>

      <div className="buyer-card">
        <div className="buyer-card-header">
          <div>
            <div className="buyer-section-title">Service Partner Engagement</div>
            <p className="text-sm text-muted">Connection activity across the marketplace.</p>
          </div>
          <button
            className="px-3 py-2 rounded-md border border-slate-200 text-sm font-semibold"
            onClick={loadEngagementSummary}
          >
            Refresh
          </button>
        </div>
        <div className="buyer-form-grid">
          <div>
            <label className="text-xs font-semibold text-muted">Source type</label>
            <select
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              value={summaryFilters.sourceType}
              onChange={(event) => setSummaryFilters((prev) => ({ ...prev, sourceType: event.target.value }))}
            >
              <option value="">All</option>
              <option value="buyer">Buyer</option>
              <option value="supplier">Supplier</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted">Engagement type</label>
            <select
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              value={summaryFilters.engagementType}
              onChange={(event) => setSummaryFilters((prev) => ({ ...prev, engagementType: event.target.value }))}
            >
              <option value="">All</option>
              <option value="lead">Lead</option>
              <option value="referral">Referral</option>
              <option value="request">Request</option>
              <option value="call">Call</option>
              <option value="email">Email</option>
              <option value="visit">Visit</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted">Start date</label>
            <input
              type="date"
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              value={summaryFilters.startDate}
              onChange={(event) => setSummaryFilters((prev) => ({ ...prev, startDate: event.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted">End date</label>
            <input
              type="date"
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              value={summaryFilters.endDate}
              onChange={(event) => setSummaryFilters((prev) => ({ ...prev, endDate: event.target.value }))}
            />
          </div>
          <div className="flex items-end">
            <button
              className="px-4 py-2 rounded-md bg-brand-700 text-white text-sm font-semibold"
              onClick={loadEngagementSummary}
            >
              Apply filters
            </button>
          </div>
        </div>
        {summaryLoading && <p className="text-sm text-muted mt-3">Loading engagement summary…</p>}
        {summaryError && <p className="text-sm text-amber-700 mt-3">{summaryError}</p>}
        {engagementSummary && (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="buyer-card">
              <div className="text-xs text-muted">Total connections</div>
              <div className="text-2xl font-semibold">{engagementSummary.total ?? 0}</div>
            </div>
            <div className="buyer-card">
              <div className="text-xs text-muted">Top engagement types</div>
              <div className="mt-2 space-y-1 text-sm">
                {(engagementSummary.byEngagementType || []).slice(0, 5).map((item: any) => (
                  <div key={item.engagementType} className="flex justify-between">
                    <span>{item.engagementType}</span>
                    <span className="font-semibold">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="buyer-card">
              <div className="text-xs text-muted">Connections by partner</div>
              <div className="mt-2 space-y-1 text-sm">
                {(engagementSummary.byServicePartner || []).slice(0, 6).map((item: any) => (
                  <div key={item.servicePartnerId} className="flex justify-between">
                    <span>{item.servicePartnerId}</span>
                    <span className="font-semibold">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="buyer-card">
              <div className="text-xs text-muted">Weekly trend</div>
              <div className="mt-2 space-y-1 text-sm">
                {(engagementSummary.byWeek || []).slice(0, 6).map((item: any) => (
                  <div key={item.week} className="flex justify-between">
                    <span>{item.week}</span>
                    <span className="font-semibold">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        <p className="mt-4 text-xs text-muted">
          1% connection fee is recorded at marketplace level; not a payout.
        </p>
      </div>
    </AdminDashboardLayout>
  );
}
