# PLATFORM_ADMIN_DASHBOARD_UI_WIREFRAME_LAYOUT_v1.0
Document ID: RRE-ADMIN-UI-WIREFRAME-v1.0
Version: v1.0
Status: DESIGN-LOCK (UI Architecture)
Classification: Internal Operations / Governance Control Surface
Authority Impact: NONE
Runtime Mutation Authorization: NOT GRANTED
Change Control: REQUIRED

## 1) Scope

Define the UI architecture and wireframe layout for the Platform Administrator Dashboard.

This document covers:
- Route/page tree
- Global layout and navigation
- Section-level panel composition
- Interaction patterns for governed mutations
- Evidence, audit, and reporting UI placement

This document does NOT authorize:
- Backend policy bypass
- Core rule changes
- Mutation logic implementation

## 2) Route Tree (App Router)

Target admin route map:

```text
/admin
  /admin/dashboard           (overview)
  /admin/financial
  /admin/governance
  /admin/suppliers
  /admin/suppliers/[id]
  /admin/products
  /admin/products/[id]
  /admin/freight
  /admin/compliance
  /admin/marketing
  /admin/comms
  /admin/risk
  /admin/rbac
  /admin/reports
  /admin/evidence
  /admin/system
  /admin/audit              (existing)
  /admin/extensions         (existing)
```

## 3) Global Shell Wireframe

```text
+----------------------------------------------------------------------------------+
| Top Bar: Env | Global Search | Alerts | Governance Badge | Profile | Sign Out   |
+----------------------+-----------------------------------------------------------+
| Left Nav             | Main Workspace                                            |
| - Dashboard          | +-------------------------------------------------------+ |
| - Financial          | | Page Header: Title | Scope filters | Last refresh    | |
| - Governance         | +-------------------------------------------------------+ |
| - Suppliers          | | KPI Row / Status Pills                                | |
| - Products           | +-------------------------------------------------------+ |
| - Freight            | | Primary Panels (tables/forms/charts/timelines)        | |
| - Compliance         | +-------------------------------------------------------+ |
| - Marketing          | | Action Drawer (reason required for mutating actions)  | |
| - Comms              | +-------------------------------------------------------+ |
| - Risk               | | Evidence / Audit strip (auditId, hash, version)       | |
| - RBAC               | +-------------------------------------------------------+ |
| - Reports            |                                                         |
| - Evidence           |                                                         |
| - System             |                                                         |
| - Audit              |                                                         |
| - Extensions         |                                                         |
+----------------------+-----------------------------------------------------------+
```

## 4) Navigation Structure

Left navigation groups:
- Executive: `Dashboard`
- Commercial: `Financial`, `Marketing`
- Governance: `Governance`, `Audit`, `Extensions`
- Operations: `Suppliers`, `Products`, `Freight`, `Compliance`, `Comms`, `Risk`
- Platform Security: `RBAC`, `System`
- Outputs: `Reports`, `Evidence`

Top bar global controls:
- Environment indicator (`DEV`/`STAGING`/`PROD`)
- Date window selector (`7d`/`30d`/`90d`)
- Incident alerts bell
- Governance badge state

## 5) Page Wireframes

### 5.1 `/admin/dashboard` (Overview)

Panels:
- KPI row: `GMV`, `Orders`, `Escrow`, `Revenue`, `Incidents`
- Governance block: subsystem PASS/FAIL + score
- Incident queue: open critical incidents
- Regulator readiness strip: latest evidence pack + hash

Interaction:
- Read-only by default; drill-down links only.

### 5.2 `/admin/financial`

Panels:
- Fee Configuration card stack
- FX Policy panel
- Escrow Policy panel
- Holds table (active/released/overridden)
- Reconciliation summary table

Mutation interaction pattern:
1. Edit draft values
2. Review before/after diff
3. Enter mandatory reason
4. Confirm mutation
5. Show response receipt: `{ auditId, version, hash }`

### 5.3 `/admin/governance`

Panels:
- Governance status matrix
- Audit runs table
- Run audit trigger
- Change control request form
- Break-glass panel (guarded, justification + duration)

### 5.4 `/admin/suppliers` and `/admin/suppliers/[id]`

List page panels:
- Supplier table with filters (`status`, `tier`, `risk`)
- Compliance status summary

Detail page panels:
- Profile + verification docs
- Risk panel
- Decision panel (`approve`, `suspend`, `terminate`, `tier change`)
- Decision history timeline (immutable)

### 5.5 `/admin/products` and `/admin/products/[id]`

List page panels:
- Product moderation queue
- Compliance expiry indicators

Detail page panels:
- Product metadata + certification summary
- RMB to AUD pricing panel (source + converted + policy ref)
- Decision actions (`approve`, `reject`, `force reverify`, `MOQ override`)

### 5.6 `/admin/freight`

Panels:
- Freight policy editor (versioned publish)
- Carrier/partner registry
- SLA board
- Settlement hold panel
- DDP rule status card

### 5.7 `/admin/compliance`

Panels:
- Compliance status overview
- Certification body registry
- Expiry table
- Manual flag panel
- Compliance incidents feed

### 5.8 `/admin/marketing`

Panels:
- Promotion queue
- Lock-week controls
- Campaign performance cards
- Bid floor controls

### 5.9 `/admin/comms`

Panels:
- Operational email health (delivery/bounce/complaints)
- Template version manager
- Event-to-email mapping table
- Chat integration health (status only)

### 5.10 `/admin/risk`

Panels:
- Incident table with severity/status
- Disputes table
- Holds panel
- Escalation/resolve action drawer

### 5.11 `/admin/rbac`

Panels:
- Role matrix (read-only for core roles)
- User role assignment panel
- Role change history
- Session termination panel
- MFA enforcement status

### 5.12 `/admin/reports`

Panels:
- Report catalog
- Parameterized generation form
- Generated report artifacts table (`hash`, `size`, `createdAt`)

### 5.13 `/admin/evidence`

Panels:
- Evidence pack builder
- Artifact download list
- Hash verification panel
- Regulator/investor export shortcuts

### 5.14 `/admin/system`

Panels:
- Service health board
- Security scan summary
- Feature flags (extension-only controls)
- Version registry + release history

## 6) Cross-Page Interaction Standards

For all mutating admin actions:
- Require reason (mandatory text field)
- Show before/after summary
- Confirm action in modal
- Return and display immutable action receipt
  - `auditId`
  - `entityId`
  - `version` (if versioned config)
  - `hash` (if artifact/config hash)

For all tables:
- Filters in URL query params for shareable views
- Stable sort defaults
- Pagination with deterministic cursor/page index

For all detail pages:
- Right-side timeline with immutable event history

## 7) UX State Model

Each panel must support:
- `loading`
- `empty`
- `error`
- `stale` (data age indicator)
- `forbidden` (RBAC)

Error display format:
- human message
- correlation id (if available)
- no sensitive internals

## 8) Security and Governance UX Constraints

- Non-admin access is blocked server-side.
- UI never assumes permission; action buttons require permission checks from backend response.
- Core constraints shown as locked controls (read-only with explanation tooltip).
- All configuration pages must display:
  - active version number
  - effective-from timestamp
  - link to previous versions
  - canonical hash of active version
- Break-glass controls isolated, visually high-risk, and always justification-bound.
- No silent saves.

## 9) Component Map (Frontend)

Core shell components:
- `AdminSidebar`
- `AdminTopBar`
- `MetricCard`
- `StatusPill`
- `AuditReceiptToast`
- `ReasonRequiredModal`
- `BeforeAfterDiffPanel`
- `ImmutableTimeline`

Domain components:
- Financial: `FeeConfigForm`, `FxPolicyForm`, `HoldsTable`
- Governance: `AuditRunsTable`, `RunAuditButton`, `ChangeControlForm`
- Suppliers: `SupplierDecisionPanel`, `SupplierDocsPanel`, `SupplierRiskPanel`
- Products: `ProductApprovalPanel`, `ComplianceSummary`, `PricingRmbAudPanel`
- Freight/Compliance: `FreightPolicyEditor`, `PartnerRegistryTable`, `ComplianceExpiryTable`
- Marketing/Comms: `PromotionQueue`, `LockWeekPanel`, `EmailHealthPanel`, `TemplateVersions`
- Risk/RBAC: `IncidentsTable`, `DisputesTable`, `RolesTable`, `UserRoleAssign`
- Reports/Evidence: `ReportGenerator`, `EvidencePackBuilder`, `ArtifactDownloads`
- System: `HealthStatus`, `SecurityScans`, `FeatureFlags`, `VersionRegistry`

## 10) Data Flow Boundaries

- UI reads from `/api/admin/dashboard/*` only.
- Mutations are command-style calls to specific domain endpoints.
- No direct DB or internal service calls from UI.
- All mutation responses must include audit linkage fields.

## 11) Acceptance Criteria (UI Architecture)

PASS when:
- Route tree exists and is role-gated
- All domain pages follow shell + panel pattern
- All mutations use reason + confirm + receipt pattern
- Governance badge visible globally in admin shell
- Evidence/hash information is accessible from reports/evidence pages

FAIL when:
- Any mutation action can execute without a reason
- Any core-locked control is editable in UI
- Any admin page bypasses server-side RBAC
- Any mutation path omits audit receipt display

## 12) Next Deliverable

Next sequential document:
- `ADMIN_DASHBOARD_GOVERNANCE_SPEC_v1.0` (formal DMS lock artefact)
