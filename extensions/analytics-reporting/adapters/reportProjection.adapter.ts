/**
 * Report Projection Adapter
 * Analytics-visible report projection only.
 */

export function projectReport(coreReport: any) {
  if (!coreReport) {
    return null;
  }

  return {
    reportId: coreReport.id,
    reportType: coreReport.type,
    period: coreReport.period,
    version: coreReport.version,
    generatedAt: coreReport.generatedAt,
    immutable: true
  };
}
