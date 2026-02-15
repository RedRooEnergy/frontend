# MASTER DASHBOARD GOVERNANCE CONTROL SURFACE SPEC v1.1
Document ID: RRE-MASTER-DASHBOARD-GOV-SPEC-v1.1  
Version: v1.1  
Supersedes: `RRE-MASTER-DASHBOARD-GOV-SPEC-v1.0` (commit `684e81f9bf6d1416b061d19f64ffad3857983583`)  
Status: DRAFT  
Classification: Unified Dashboard Governance Architecture  
Authority Impact: NONE (Specification Only)  
Runtime Authorization: NOT GRANTED  
Change Control: REQUIRED

## 1) Purpose

Define one enforceable governance model for all dashboard control surfaces so authority boundaries, mutation controls, audit evidence, and CI gates are consistent across:
- CEO / Executive Dashboard,
- Grand-Master (Platform Admin) Dashboard,
- Installer Dashboard,
- Freight Dashboard,
- Insurance Dashboard,
- Accreditation / Compliance Dashboard.

## 2) Controlled Vocabulary

- `Dashboard Mutation`: any `POST`/`PATCH`/`PUT`/`DELETE` route that changes persistent state.
- `Override Class`: a mutation that changes hold state, policy state, payout gating, compliance decision state, or risk flag state.
- `Evidence Artefact`: any hash-verifiable report/export/reference used to support a governance decision.
- `Receipt Envelope`: deterministic mutation response payload:
  - `{ ok, auditId, entityId, version?, hash? }`
- `Audit Triple` (mandatory):
  1. versioned config document or domain state document,
  2. admin action/event record,
  3. immutable audit log record linked by `auditId`.

## 3) Mandatory Shared Primitives (Canonical Mapping)

All dashboards inherit the same primitives. Existing repo canonical names are:

| Primitive | Canonical Name / Path | Notes |
| --- | --- | --- |
| Immutable audit ledger | `admin_audit_logs` via `frontend/lib/adminDashboard/auditWriter.ts` (`ADMIN_AUDIT_COLLECTION`) | Append-only evidence ledger. |
| Admin action/event record | `admin_audit_logs` (current canonical) | If a separate `admin_action_records` collection is introduced later, it must maintain 1:1 link to `auditId`. |
| Evidence pack / report artefact | Evidence manifests and hash artefacts from `frontend/lib/auditComms/export/evidencePackAssembler.ts` and `frontend/scripts/evidence/build-evidence-pack.ts` | Hash and manifest are mandatory. |
| Settlement hold lifecycle | `admin_settlement_holds` via `frontend/lib/adminDashboard/settlementHoldStore.ts` | Status transitions must link to immutable audit records. |
| Freight hold lifecycle (domain-specific) | `freight_settlement_holds` via `frontend/lib/freightAudit/FreightSettlementHoldStore.ts` | Used for freight enforcement surfaces. |
| Change control events | `admin_change_control_events` via `frontend/lib/adminDashboard/changeControlStore.ts` | Governance change surface. |

### 3.1 Immutable Ledger Supremacy Clause

- The immutable ledger (`admin_audit_logs`) is the authoritative audit record.
- Any human-facing admin action view must reference the same `auditId` from the immutable ledger.
- Parallel mutation logs without immutable-ledger linkage are prohibited.
- If a separate `admin_action_records` view is introduced in the future, it must be derivative-only and cannot replace ledger authority.

## 4) Dashboard Scope and Layer Separation

- CEO Dashboard: strategic read-only insight only.
- Grand-Master Dashboard: governed operational mutation surface.
- Installer/Freight/Insurance/Accreditation Dashboards: domain-scoped operations under explicit allow-lists.

Out of scope for this document:
- runtime role-key changes,
- direct Immutable Core rewrites,
- endpoint activation by documentation alone.

### 4.1 Role Mapping Constraint Clause

- Governance-layer roles in Appendix A are aliases only and do not create runtime permissions.
- Governance aliases must map explicitly to one of the closed runtime role keys listed in Appendix A.
- Runtime role `regulator` is read-only by default and may mutate only where an explicit endpoint-level exception is declared in Appendix A.
- No new runtime role keys may be introduced without formal change control and ratification.
- CI must fail if a runtime role key appears outside the closed set.

## 5) Immutable Core Invariants (Global)

No dashboard may bypass:
- pricing snapshot immutability,
- escrow/settlement integrity gates,
- append-only audit semantics,
- server-side RBAC default-deny controls,
- deterministic evidence hash and manifest requirements,
- required CI + branch protection enforcement.

## 6) Authority-by-Endpoint Rule (No Silent Scope Creep)

1. Every dashboard must publish an explicit endpoint allow-list by role and method.  
2. No dashboard is PASS without endpoint inventory coverage.  
3. Any endpoint not listed in the allow-list is denied by policy.  
4. Endpoint inventory is authoritative only when listed in:
   - `docs/governance/MASTER_DASHBOARD_GOVERNANCE_CONTROL_SURFACE_APPENDIX_A_RBAC_ENDPOINT_MATRIX_v1.0.md`.
5. CI must automatically enumerate all server-side route definitions and compare results against Appendix A inventory controls:
   - `frontend/app/api/**` (Next.js App Router API routes),
   - `backend/routes/**` (Express routes), where present.
6. Any undeclared route in governed dashboard surfaces is a governance FAIL.

## 7) Unified Dashboard Control Matrix (High-Level)

| Dashboard | Default Mode | Mutation Class | Required Approval |
| --- | --- | --- | --- |
| CEO / Executive | Read-only | None | N/A |
| Grand-Master Admin | Read + Governed Mutation | Config, queue, hold, governance control actions | Single for normal, Dual for override class |
| Installer | Domain-scoped | Assigned operational lifecycle updates | Single |
| Freight | Domain-scoped | Freight lifecycle updates and governed hold actions | Single (Dual for override class) |
| Insurance | Domain-scoped | Claim lifecycle and evidence recommendations | Single |
| Accreditation / Compliance | Domain-scoped | Certification/compliance lifecycle updates | Single (Dual for override class) |

## 8) Mandatory Mutation Protocol (Global)

Every dashboard mutation must enforce:
1. server-side RBAC (default deny),
2. allow-list payload validation,
3. mandatory `justification`,
4. mandatory `requestId` (idempotency key),
5. mandatory `incidentId` for override class,
6. required approval policy (none/single/dual as declared in Appendix A),
7. Audit Triple creation,
8. deterministic Receipt Envelope response.

`requestId` mapping note:
- Existing surfaces using `correlationId` are treated as legacy alias and must map 1:1 to `requestId`.

## 9) Evidence Binding Requirements by Dashboard

| Dashboard | Required Evidence Binding |
| --- | --- |
| CEO / Executive | Aggregated scorecards, governance status snapshots, export hash manifest references only (no raw mutable artifacts). |
| Grand-Master Admin | Mutation receipt (`auditId`), before/after hash, version references, change-control/event linkage, evidence pack hash references. |
| Installer | Work logs, installation proof references, milestone timestamps, linked case/order refs. |
| Freight | DDP breakdown references, customs clearance refs, delivery confirmation refs, freight hold refs and audit links. |
| Insurance | Claim evidence pack refs, adjuster notes refs, payout recommendation refs (execution prohibited). |
| Accreditation / Compliance | Certificate artefacts, lab/body refs, expiry schedule, rejection reasons, compliance incident linkage. |

## 10) Fail-Closed Operational Behavior

| Condition | API Behavior | UI Behavior | Audit Behavior |
| --- | --- | --- | --- |
| Authorization failure | Return `403` | Show denied state; no mutation UI action | Log access-denied event where policy requires |
| Missing required governance fields (`justification`, `requestId`, `incidentId` for override) | Return `400` | Block submit; show required-field errors | No mutation write; validation error logged |
| Governance integrity uncertainty / hold condition | Return `409` or `412` with governance hold code | Render `DEGRADED`/`UNKNOWN`; never show success | Record hold/degraded event |
| Evidence hash/manifest mismatch | Return `409` | Show integrity failure; disable downstream action | Log integrity error event |
| CI-required check or critical rule failure state surfaced in mutation gate | Return `409`/`423` per endpoint contract | Disable mutation controls; show governance blocking reason | Record blocked mutation attempt |

No mutation route may return soft success under integrity uncertainty.

## 11) Unified Global PASS/FAIL Rules

Global FAIL if any one occurs:
- mutation without immutable audit linkage,
- override class execution without declared approvals,
- payout/release path bypassing snapshot or escrow integrity,
- restricted endpoint reachable by unauthorized role,
- evidence/report artefact without hash manifest,
- mandatory justification missing/empty,
- mandatory `requestId` missing/empty,
- mandatory `incidentId` missing/empty for override class,
- endpoint not declared in Appendix A.

Global PASS requires all controls above to be enforced and test-verified.

## 12) Dashboard-Specific PASS/FAIL Requirement

Dashboard-specific gates are mandatory and are defined in:
- `docs/governance/MASTER_DASHBOARD_GOVERNANCE_CONTROL_SURFACE_APPENDIX_B_PASSFAIL_GATES_v1.0.md`

No dashboard may claim PASS by global gates alone.

## 13) CI and Badge Integration Contract

Dashboard governance CI must:
- execute mutation guard tests and role/route access tests,
- produce dashboard scorecard artefacts with timestamp and hash,
- fail on any critical governance gate failure,
- publish badge/status outputs from scorecard evidence only.

No dashboard may self-assert PASS without CI artefact evidence.

## 14) Required Inheritance Appendices

This master spec is lock-ready only with:
- Appendix A RBAC + endpoint + mutation allow-list matrix:
  - `docs/governance/MASTER_DASHBOARD_GOVERNANCE_CONTROL_SURFACE_APPENDIX_A_RBAC_ENDPOINT_MATRIX_v1.0.md`
- Appendix B executable PASS/FAIL gates and CI proof requirements:
  - `docs/governance/MASTER_DASHBOARD_GOVERNANCE_CONTROL_SURFACE_APPENDIX_B_PASSFAIL_GATES_v1.0.md`

## 15) Non-Authorization Clause

This document is governance specification only.

It does not authorize:
- runtime permission expansion,
- endpoint activation,
- RBAC role-key mutation,
- bypass of Immutable Core constraints.

Implementation and activation require separate approved change-control and ratification artefacts.

## 16) Activation Protocol Cross-Reference

State promotion for this control surface is governed by:
- `docs/governance/GOVERNANCE_ACTIVATION_AND_RATIFICATION_PROTOCOL_v1.0.md`
- `docs/governance/GOVERNANCE_ACTIVATION_REGISTER.md`
