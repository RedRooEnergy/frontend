import Link from "next/link";
import StatusPill from "../../_components/StatusPill";

const AUTHORITY_VERSION = "v1.0";
const EFFECTIVE_DATE = "2026-02-14";
const EXTENSION_ID = "EXT-GOV-AUTH-01";
const MANIFEST_SHA256 = "45edfccb03ae6642c95871e553f96c8d9990f754c42b53fa758c298809026e25";
const BOARD_RESOLUTION_ID = "RRE-BRD-RES-PLATFORM-DESIGN-AUTHORITY-LOCK-v1.0";
const DMS_ROW_REFERENCE = "00.XX.01";

const MERMAID_SOURCE = `flowchart TD
    GM[Grand-Master]

    GM --> PAC[Platform Architect Council]

    PAC --> CORE[Core Governance Lead]
    PAC --> FIN[Finance Governance Lead]
    PAC --> COMP[Compliance Governance Lead]
    PAC --> COMM[Commercial Governance Lead]
    PAC --> DOM[Domain Build Authorities]

    CORE --> ID[Identity / RBAC]
    CORE --> AUDIT[Audit Engine]
    CORE --> EVIDENCE[Evidence Chain]

    FIN --> PAY[Payments]
    FIN --> ESCROW[Escrow]
    FIN --> TAX[Tax / GST]

    COMP --> CERT[Certification]
    COMP --> REG[Regulatory]
    COMP --> WARRANTY[Warranty]

    COMM --> PRICE[Pricing Engine]
    COMM --> PROMO[Promotions]
    COMM --> CATALOGUE[Catalogue]

    DOM --> SUP[Supplier Build]
    DOM --> BUY[Buyer Build]
    DOM --> INST[Installer Build]
    DOM --> FREIGHT[Freight Build]
    DOM --> CRM[CRM / Email]`;

const DOC_REFS = [
  {
    label: "Authority Hierarchy (Locked)",
    path: "docs/00_master_project_definition/RRE-00-PLATFORM-AUTHORITY-HIERARCHY-v1.0.md",
  },
  {
    label: "Authority Extension Spec (Locked)",
    path: "docs/extensions/EXT-GOV-AUTH-01/EXT-GOV-AUTH-01_SPEC.md",
  },
  {
    label: "Board Resolution (Lock)",
    path: "docs/governance/BOARD_RESOLUTION_PLATFORM_DESIGN_AUTHORITY_LOCK_v1.0.md",
  },
  {
    label: "Lock Manifest",
    path: "docs/governance/PLATFORM_DESIGN_AUTHORITY_LOCK_MANIFEST_v1.0.json",
  },
  {
    label: "DMS Index Row",
    path: "docs/00_master_document_inventory.md",
  },
] as const;

const REPO_BLOB_BASE = "https://github.com/RedRooEnergy/rre-frontend/blob/main";

export default function GovernanceAuthorityPage() {
  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold text-slate-900">Design Authority Tree</h2>
        <p className="text-sm text-slate-600">
          Read-only governance view for platform design authority. Runtime RBAC and operational permissions are unchanged.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">Authority version</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{AUTHORITY_VERSION}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">Effective date</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{EFFECTIVE_DATE}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">Extension</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{EXTENSION_ID}</p>
          <div className="mt-2">
            <StatusPill label="LOCKED" tone="green" />
          </div>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">Board resolution</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{BOARD_RESOLUTION_ID}</p>
          <p className="mt-2 text-xs text-slate-500">DMS row: {DMS_ROW_REFERENCE}</p>
        </article>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">Manifest SHA-256</h3>
        <p className="mt-2 break-all rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-700">{MANIFEST_SHA256}</p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">Authority Hierarchy (Mermaid Source)</h3>
        <p className="mt-1 text-sm text-slate-600">Static rendering for locked governance reference.</p>
        <pre className="mt-3 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800">{MERMAID_SOURCE}</pre>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">Approval Log References</h3>
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          {DOC_REFS.map((item) => (
            <li key={item.path}>
              <Link
                href={`${REPO_BLOB_BASE}/${item.path}`}
                target="_blank"
                rel="noreferrer noopener"
                className="font-medium text-blue-700 hover:underline"
              >
                {item.label}
              </Link>
              <p className="font-mono text-xs text-slate-500">{item.path}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
