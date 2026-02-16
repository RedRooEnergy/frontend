"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminDashboardLayout from "../../../../components/AdminDashboardLayout";
import { getSession } from "../../../../lib/store";

type TrendStatus = "STABLE" | "REGRESSION" | "IMPROVING";
type SubsystemOverall = "PASS" | "FAIL" | "NO_DATA";

type PlatformStatus = {
  ok: boolean;
  generatedAtUtc: string;
  overall: "PASS" | "FAIL";
  trendStatus: TrendStatus;
  summary: {
    totalSubsystems: number;
    passCount: number;
    failCount: number;
    noDataCount: number;
  };
  subsystems: Array<{
    id: string;
    label: string;
    source: string;
    overall: SubsystemOverall;
    trendStatus: TrendStatus;
    latestRunId: string | null;
    timestampUtc: string | null;
    passCount: number;
    failCount: number;
    notBuiltCount: number;
    notApplicableCount: number;
    notes: string;
  }>;
};

function statusClass(value: SubsystemOverall) {
  if (value === "PASS") return "buyer-pill";
  if (value === "NO_DATA") return "buyer-pill is-warning";
  return "buyer-pill is-danger";
}

function trendClass(value: TrendStatus) {
  if (value === "IMPROVING") return "buyer-pill";
  if (value === "STABLE") return "buyer-pill";
  return "buyer-pill is-danger";
}

function short(value: string | null) {
  if (!value) return "—";
  return value.length > 18 ? `${value.slice(0, 9)}...${value.slice(-6)}` : value;
}

export default function AdminGovernanceStatusPage() {
  const router = useRouter();
  const session = getSession();
  const [status, setStatus] = useState<PlatformStatus | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session || session.role !== "admin") {
      router.replace("/signin?role=admin");
      return;
    }

    async function loadStatus() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/governance/platform/status", { cache: "no-store" });
        if (!res.ok) {
          setError(`Unable to load platform governance status (${res.status}).`);
          return;
        }
        const json = (await res.json()) as PlatformStatus;
        setStatus(json);
      } catch (err: any) {
        setError(err?.message || "Unable to load platform governance status.");
      } finally {
        setLoading(false);
      }
    }

    void loadStatus();
  }, [router, session]);

  const sortedSubsystems = useMemo(() => {
    const items = status?.subsystems ?? [];
    return [...items].sort((a, b) => a.label.localeCompare(b.label));
  }, [status]);

  return (
    <AdminDashboardLayout title="Platform Governance Status">
      <div className="buyer-card">
        <div className="buyer-card-header">
          <div>
            <div className="buyer-section-title">Governance Aggregator</div>
            <p className="text-sm text-muted">
              Consolidated status across blocking governance audits and public participant governance.
            </p>
          </div>
          <img
            src="/api/governance/platform/badge"
            alt="Platform governance badge"
            width={215}
            height={20}
            className="h-5 w-auto"
          />
        </div>
        <div className="text-xs text-muted">
          <div>Status endpoint: /api/governance/platform/status</div>
          <div>Badge endpoint: /api/governance/platform/badge</div>
        </div>
      </div>

      {loading && (
        <div className="buyer-card">
          <p className="text-sm text-muted">Loading governance status...</p>
        </div>
      )}

      {!loading && error && (
        <div className="buyer-card">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      {!loading && !error && status && (
        <>
          <div className="buyer-card">
            <div className="buyer-card-header">
              <div className="buyer-section-title">Platform Summary</div>
              <div className="flex gap-2">
                <span className={statusClass(status.overall)}>{status.overall}</span>
                <span className={trendClass(status.trendStatus)}>{status.trendStatus}</span>
              </div>
            </div>
            <div className="buyer-form-grid">
              <div className="buyer-card">
                <div className="text-xs text-muted">Subsystems</div>
                <div className="text-xl font-semibold">{status.summary.totalSubsystems}</div>
              </div>
              <div className="buyer-card">
                <div className="text-xs text-muted">PASS</div>
                <div className="text-xl font-semibold">{status.summary.passCount}</div>
              </div>
              <div className="buyer-card">
                <div className="text-xs text-muted">FAIL</div>
                <div className="text-xl font-semibold">{status.summary.failCount}</div>
              </div>
              <div className="buyer-card">
                <div className="text-xs text-muted">NO_DATA</div>
                <div className="text-xl font-semibold">{status.summary.noDataCount}</div>
              </div>
              <div className="buyer-card">
                <div className="text-xs text-muted">Generated (UTC)</div>
                <div className="text-sm font-semibold">{status.generatedAtUtc}</div>
              </div>
            </div>
          </div>

          <div className="buyer-card">
            <div className="buyer-card-header">
              <div className="buyer-section-title">Subsystem Breakdown</div>
              <div className="text-xs text-muted">Deterministic roll-up sources</div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted border-b">
                    <th className="py-2 pr-4">Subsystem</th>
                    <th className="py-2 pr-4">Overall</th>
                    <th className="py-2 pr-4">Trend</th>
                    <th className="py-2 pr-4">Run</th>
                    <th className="py-2 pr-4">PASS/FAIL</th>
                    <th className="py-2 pr-4">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSubsystems.map((subsystem) => (
                    <tr key={subsystem.id} className="border-b last:border-b-0">
                      <td className="py-2 pr-4 font-semibold">{subsystem.label}</td>
                      <td className="py-2 pr-4">
                        <span className={statusClass(subsystem.overall)}>{subsystem.overall}</span>
                      </td>
                      <td className="py-2 pr-4">
                        <span className={trendClass(subsystem.trendStatus)}>{subsystem.trendStatus}</span>
                      </td>
                      <td className="py-2 pr-4 font-mono text-xs" title={subsystem.latestRunId || ""}>
                        {short(subsystem.latestRunId)}
                      </td>
                      <td className="py-2 pr-4">
                        {subsystem.passCount}/{subsystem.failCount}
                      </td>
                      <td className="py-2 pr-4 text-xs text-muted">{subsystem.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </AdminDashboardLayout>
  );
}
