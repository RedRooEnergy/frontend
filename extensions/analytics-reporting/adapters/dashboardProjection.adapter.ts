/**
 * Dashboard Projection Adapter
 * Transforms Core dashboard descriptors into analytics-visible projections.
 * No mutation. No inference. No enrichment.
 */

export function projectDashboard(coreDashboard: any) {
  if (!coreDashboard) {
    return null;
  }

  return {
    dashboardId: coreDashboard.id,
    name: coreDashboard.name,
    category: coreDashboard.category,
    description: coreDashboard.description,
    lastUpdatedAt: coreDashboard.lastUpdatedAt
  };
}
