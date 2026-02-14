type ReportCatalogProps = {
  backendAvailable: boolean;
};

const staticReports = [
  "FINANCIAL_RECONCILIATION",
  "SUPPLIER_PERFORMANCE",
  "COMPLIANCE_STATUS",
  "FREIGHT_PERFORMANCE",
  "GOVERNANCE_SNAPSHOT",
];

export default function ReportCatalog({ backendAvailable }: ReportCatalogProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">Report catalog</h3>
      <ul className="mt-3 list-disc pl-5 text-sm text-slate-700">
        {staticReports.map((report) => (
          <li key={report}>{report}</li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-slate-500">
        {backendAvailable
          ? "Catalog hydrated from backend endpoint."
          : "Catalog currently static because report endpoint is not wired in this phase."}
      </p>
    </section>
  );
}
