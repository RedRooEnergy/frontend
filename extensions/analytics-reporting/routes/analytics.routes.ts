/**
 * Analytics & Reporting Routes
 * Dashboard and report visibility only.
 */

import {
  projectDashboard
} from "../adapters/dashboardProjection.adapter";

import {
  projectReport
} from "../adapters/reportProjection.adapter";

function assertAnalyticsScope(
  req: any,
  res: any,
  requiredScope: string
): boolean {
  const auth = req.auth;

  if (!auth) {
    res.status(401).json({ error: "AUTH_REQUIRED" });
    return false;
  }

  const allowedRoles = [
    "Administrator",
    "ComplianceAuthority",
    "FinanceAuthority",
    "Executive"
  ];

  if (!allowedRoles.includes(auth.role)) {
    res.status(403).json({ error: "ROLE_NOT_PERMITTED" });
    return false;
  }

  if (!Array.isArray(auth.scopes) || !auth.scopes.includes(requiredScope)) {
    res.status(403).json({ error: "INSUFFICIENT_SCOPE" });
    return false;
  }

  return true;
}

export function registerAnalyticsRoutes(app: any) {
  app.get("/analytics/health", (_req: any, res: any) => {
    res.json({
      extension: "EXT-12",
      status: "READ_ONLY_ACTIVE"
    });
  });

  app.get("/analytics/dashboards", (req: any, res: any) => {
    if (!assertAnalyticsScope(req, res, "ANALYTICS_PLATFORM_OVERVIEW")) return;

    const dashboards: any[] = []; // Core injection point (not implemented)

    const projections = dashboards.map(d =>
      projectDashboard(d)
    );

    res.status(200).json({
      source: "CORE",
      dashboards: projections
    });
  });

  app.get("/analytics/reports", (req: any, res: any) => {
    if (!assertAnalyticsScope(req, res, "REPORT_VIEW")) return;

    const reports: any[] = []; // Core injection point (not implemented)

    const projections = reports.map(r =>
      projectReport(r)
    );

    res.status(200).json({
      source: "CORE",
      reports: projections
    });
  });

  app.get("/analytics/reports/:reportId", (req: any, res: any) => {
    if (!assertAnalyticsScope(req, res, "REPORT_VIEW")) return;

    const report = null; // Core injection point (not implemented)

    const projection = report
      ? projectReport(report)
      : null;

    res.status(200).json({
      source: "CORE",
      report: projection
    });
  });
}
