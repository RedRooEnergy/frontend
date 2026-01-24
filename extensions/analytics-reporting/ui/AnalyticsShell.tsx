/**
 * AnalyticsShell
 * Read-only UI wired to EXT-12 analytics routes.
 * No calculations, no exports, no inferred state.
 */

import { useEffect, useState } from "react";
import {
  emitDashboardListView,
  emitReportListView
} from "../events/analytics.events";

type DashboardProjection = {
  dashboardId: string;
  name: string;
  category: string;
  description?: string;
};

type ReportProjection = {
  reportId: string;
  reportType: string;
  period: string;
  version: string;
};

export default function AnalyticsShell() {
  const [dashboards, setDashboards] = useState<DashboardProjection[]>([]);
  const [reports, setReports] = useState<ReportProjection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const [dashRes, repRes] = await Promise.all([
          fetch("/analytics/dashboards"),
          fetch("/analytics/reports")
        ]);

        const dashData = await dashRes.json();
        const repData = await repRes.json();

        setDashboards(dashData.dashboards || []);
        setReports(repData.reports || []);
        emitDashboardListView();
        emitReportListView();
      } catch {
        setDashboards([]);
        setReports([]);
      } finally {
        setLoading(false);
      }
    }

    loadAnalytics();
  }, []);

  if (loading) {
    return <p>Loading analytics…</p>;
  }

  return (
    <div>
      <h1>Analytics & Reporting</h1>

      <h2>Dashboards</h2>
      {!dashboards.length && <p>No dashboards available.</p>}
      <ul>
        {dashboards.map(d => (
          <li key={d.dashboardId}>
            <strong>{d.name}</strong> ({d.category})
            <br />
            {d.description}
          </li>
        ))}
      </ul>

      <h2>Reports</h2>
      {!reports.length && <p>No reports available.</p>}
      <ul>
        {reports.map(r => (
          <li key={r.reportId}>
            <strong>{r.reportType}</strong> — {r.period} (v{r.version})
          </li>
        ))}
      </ul>
    </div>
  );
}
