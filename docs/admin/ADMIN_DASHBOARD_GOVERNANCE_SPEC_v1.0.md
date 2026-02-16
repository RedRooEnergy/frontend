# ADMIN_DASHBOARD_GOVERNANCE_SPEC_v1.0
Document ID: RRE-ADMIN-GOV-SPEC-v1.0
Version: v1.0
Status: LOCK-READY
Classification: Platform Governance Control Surface
Series Mapping: 02 (Document Control and Governance) / 06 (Marketplace Business Rules)
Authority Impact: CONTROLLED (Admin Surface Only)
Runtime Mutation Authorization: GRANTED WITH GOVERNED CONSTRAINTS
Change Control: REQUIRED

## 1) Purpose

Define the governance contract for the RedRooEnergy Platform Administrator Dashboard as the operational control layer for commercial configuration, compliance oversight, platform risk management, and governance monitoring.

This specification establishes:
- permitted admin control surfaces
- non-bypassable platform invariants
- mutation controls and audit obligations
- evidence and reporting requirements
- board-level change control requirements

## 2) Scope

In scope:
- Admin dashboard control surfaces under `/admin/*` and `/api/admin/dashboard/*`
- Financial configuration controls
- Governance run controls
- Supplier/product/freight/compliance administration
- Risk incident controls
- RBAC administration within boundary rules
- Reports and evidence pack generation controls

Out of scope:
- Immutable Core rewrite
- direct policy bypass in runtime services
- unaudited emergency overrides
- ungoverned role model expansion

## 3) Governance Principles

- Immutable Core supremacy applies at all times.
- Administrator may configure market behavior, not rewrite platform authority boundaries.
- Every mutation requires explicit reason and immutable audit evidence.
- Versioned configuration is mandatory for governed policies.
- Evidence outputs must be reproducible and hash-verifiable.
- No silent configuration changes are permitted.

## 4) Immutable Core Boundaries (Non-Bypassable)

The Admin Dashboard must not allow disabling or bypassing:
- pricing snapshot immutability
- escrow integrity gates
- role boundary protections for core roles
- audit log append-only semantics
- regulator evidence masking requirements

Any attempt to alter these controls requires formal board-approved change control and must not be executable directly from the dashboard.

## 5) Admin Control Surface Matrix

### 5.1 Executive Overview (Read-Only)
- GMV and order state rollups
- escrow held/released state
- governance status and score
- open critical incidents
- regulator alert indicators

### 5.2 Financial Controls (Governed Mutation)
- fee schedule management
- FX policy configuration
- escrow policy configuration
- settlement hold placement and governed override
- reconciliation summaries

### 5.3 Governance Controls (Governed Mutation + Read)
- audit run triggers
- audit run history and result retrieval
- change-control request submission
- break-glass invocation (justified/time-bound)

### 5.4 Supply and Product Controls (Governed Mutation)
- supplier approve/suspend/terminate/tier changes
- product approve/reject/reverify
- governed MOQ and policy-constrained pricing controls

### 5.5 Freight and Compliance Controls (Governed Mutation)
- freight policy versioning
- carrier/partner lifecycle controls
- compliance policy and certification registry controls
- manual compliance flagging

### 5.6 Communications and Marketing Controls (Governed Mutation)
- promotion queue decisions
- lock-week generation controls
- operational email template version publishing
- communications subsystem health configuration

### 5.7 Risk and Incident Controls (Governed Mutation)
- incident escalation and resolution actions
- dispute and hold controls
- risk classification operations

### 5.8 RBAC Controls (Boundary-Constrained Mutation)
- governed role assignment/revocation
- session termination
- MFA enforcement controls

### 5.9 Reports and Evidence (Read + Generation)
- report generation with reproducibility metadata
- evidence pack generation/download
- hash verification access and export controls

### 5.10 System Controls (Boundary-Constrained Mutation)
- extension feature flags
- health and security status readouts
- version and release registry visibility

## 6) Mandatory Mutation Protocol

All state-changing operations must enforce:
1. server-side RBAC authorization
2. schema validation with allow-listed fields
3. mandatory reason field
4. mutation confirmation workflow (UI + API contract)
5. immutable audit record creation
6. deterministic response receipt payload

Required mutation response envelope:
```json
{
  "ok": true,
  "auditId": "string",
  "entityId": "string",
  "version": "optional",
  "hash": "optional"
}
```

## 7) Versioning and Immutability Rules

For governed configs (fees, FX, escrow, freight, compliance):
- no in-place silent overwrite
- new version record must be created
- active version must be explicit
- prior versions remain retrievable

UI transparency requirement:
- active version number visible
- effective-from timestamp visible
- previous versions link visible
- canonical hash of active version visible

## 8) Audit and Evidence Requirements

Each governed mutation must create:
- immutable audit event
- admin action record (decision trace)
- linked evidence references where provided

Each generated report/evidence artifact must include:
- SHA-256 hash
- generation timestamp (UTC ISO-8601)
- source/correlation metadata
- retrievable manifest (where applicable)

## 9) Break-Glass Control

Break-glass behavior must be:
- explicitly isolated in UI
- justification-bound (mandatory reason)
- duration-bound (explicit expiry)
- fully audited as control event
- reviewable in governance/audit surfaces

Break-glass must not disable Immutable Core protections.

## 10) RBAC Governance Rules

- Non-admin actors cannot access admin surfaces.
- Core roles are protected by boundary constraints.
- Role mutations are audited and reviewable.
- Session termination and MFA enforcement actions are auditable.

No client-side-only authorization patterns are acceptable.

## 11) Reporting and Regulatory Readiness

Admin dashboard outputs must support:
- investor-ready reproducibility
- regulator-ready evidence traceability
- deterministic hash verification
- export artifact cataloging

Regulator-facing outputs must preserve masking/suppression doctrine where applicable.

## 12) Observability and Integrity Requirements

The dashboard must expose:
- governance badge state
- CRITICAL rule status visibility
- incident and subsystem health correlation views
- control-event traceability

No governance state mutation may occur from read-only status views.

## 13) Security Requirements

- server-side auth enforcement on all admin routes
- origin/CSRF protections for mutating operations
- rate limiting on admin mutation endpoints
- sensitive error suppression with correlation IDs
- append-only audit log integrity

## 14) Acceptance Criteria

PASS when:
- all admin mutation surfaces enforce reason + audit
- immutable/versioned config doctrine is operational
- core boundaries are non-bypassable via admin UI/API
- reports/evidence are hash-verifiable
- RBAC protections are enforced server-side

FAIL when:
- any mutation executes without reason/audit
- any core boundary can be disabled from admin controls
- versioned configs are overwritten silently
- evidence/report outputs are non-reproducible

## 15) Change Control Requirements

Any change to:
- control surface authority
- mutation protocol
- config versioning semantics
- audit/evidence requirements
- core boundary protections

requires:
- formal change-control request
- version increment of this spec
- updated close-pack references
- board-level ratification update

No exceptions.

## 16) Lock Declaration

This document defines the governance lock for the Platform Administrator Dashboard control model.

Implementation must remain within the constraints of this specification and associated extension governance artefacts.
