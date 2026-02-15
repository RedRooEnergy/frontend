# MASTER DASHBOARD GOVERNANCE CONTROL SURFACE SPEC v1.0
Document ID: RRE-MASTER-DASHBOARD-GOV-SPEC-v1.0  
Version: v1.0  
Status: DRAFT  
Classification: Unified Dashboard Governance Architecture  
Authority Impact: NONE (Specification Only)  
Runtime Authorization: NOT GRANTED  
Change Control: REQUIRED

## 1) Purpose

Define one unified governance architecture for all platform dashboards so visibility, mutation authority, audit obligations, and enforcement behavior are consistent across domains.

This spec governs:
- dashboard authority boundaries,
- mutation control protocol,
- audit and evidence requirements,
- unified PASS/FAIL control rules,
- governance score and badge integration expectations.

## 2) Dashboard Scope

This unified model applies to:
- CEO / Executive Oversight Dashboard,
- Grand-Master (Platform Admin) Dashboard,
- Installer Dashboard,
- Freight Dashboard,
- Insurance Dashboard,
- Accreditation / Compliance Dashboard.

Out of scope:
- runtime role-key changes,
- direct mutation of Immutable Core controls,
- subsystem-specific implementation details not linked to dashboard control surfaces.

## 3) Authority Model

### 3.1 Control Layer Separation

- Executive Dashboard: strategic read-only aggregate visibility.
- Grand-Master Dashboard: governed operational control surface.
- Domain Dashboards (Installer/Freight/Insurance/Accreditation): domain-scoped execution and evidence surfaces.

### 3.2 Non-Bypass Rule

No dashboard may:
- bypass Immutable Core constraints,
- bypass server-side RBAC,
- bypass audit logging,
- mutate state without governed justification.

## 4) Immutable Core Invariants (Global)

The following are non-bypassable across all dashboards:
- pricing snapshot immutability,
- escrow and settlement integrity gates,
- append-only audit log semantics,
- role boundary enforcement and default-deny access,
- deterministic evidence hashing and manifest generation,
- governance CI required checks and branch protection controls.

## 5) Unified Dashboard Control Matrix

| Dashboard | Primary Role(s) | Default Mode | Permitted Mutations | Explicitly Prohibited |
| --- | --- | --- | --- | --- |
| CEO / Executive | Executive, Board Observer, Auditor | Read-only | None | Operational overrides, payout/release actions, compliance decisions |
| Grand-Master Admin | Platform Admin (Grand-Master), Governance Leads | Read + Governed Mutation | Config versioning, queue triage, approvals, escalation, evidence generation | Core bypass, unaudited changes, single-step overrides without policy |
| Installer | Installer Ops, Service Coordinators | Domain Read/Write (Scoped) | Assigned job/case lifecycle updates under policy | Cross-domain financial/compliance overrides |
| Freight | Freight Ops, Customs Coordinators | Domain Read/Write (Scoped) | Shipment/case updates, freight exception handling, governed holds requests | Direct escrow release bypass, pricing mutation |
| Insurance | Claims/Oversight Roles | Domain Read/Write (Scoped) | Claim progression and evidence actions | Payment authority escalation outside policy |
| Accreditation / Compliance | Compliance Officers, Accreditation Ops | Domain Read/Write (Scoped) | Certification review status, compliance incident lifecycle | Manual compliance bypass of Core constraints |

## 6) Global Mutation Protocol (Mandatory)

Any dashboard mutation must enforce, in order:
1. server-side RBAC authorization (default deny),
2. allow-list request validation,
3. mandatory `justification`,
4. mandatory `incidentId` for override classes,
5. governed approval requirements where applicable (dual approval for override classes),
6. immutable audit event write with before/after snapshot hash,
7. deterministic mutation receipt payload.

Standard receipt envelope:
```json
{
  "ok": true,
  "auditId": "string",
  "entityId": "string",
  "version": "optional",
  "hash": "optional"
}
```

## 7) Unified PASS/FAIL Governance Rules

Global FAIL conditions (any one triggers FAIL):
- mutation without immutable `AdminActionLog` (or equivalent governed audit record),
- override execution without required approvals,
- payout/release path bypassing snapshot or escrow integrity guards,
- restricted endpoint reachable by unauthorized role,
- evidence/report artefact generated without hash manifest,
- dashboard hides active subsystem FAIL conditions,
- missing or empty mandatory justification fields.

PASS requires all controls above to be enforced and test-verified.

## 8) CI and Badge Integration Contract

Unified dashboard governance CI must:
- run dashboard governance tests and mutation guard tests,
- emit deterministic scorecard artefacts,
- fail on any critical governance rule breach,
- publish badge/status endpoint outputs from governance scorecards only.

No dashboard may self-assert PASS without CI artefact evidence.

## 9) Data and Evidence Requirements

All dashboards must support:
- UTC timestamped event and report trails,
- reproducible report generation metadata,
- SHA-256 hash-verifiable artefacts,
- cross-reference from summary views to underlying governed evidence.

Sensitive data display must follow masking and least-privilege rules.

## 10) Operational Safety and Failure Behavior

On governance uncertainty or data integrity failure:
- dashboards fail closed for mutation paths,
- read paths show degraded/unknown status explicitly,
- no inferred or silent fallback mutation behavior is permitted.

## 11) Governance Sequencing Requirement

For any new dashboard control surface:
1. design spec lock,
2. schema and API contract lock,
3. PASS/FAIL rule lock,
4. CI gate integration,
5. close pack and manifest registration,
6. board ratification as required by authority class.

No sequencing step may be skipped.

## 12) Non-Authorization Clause

This document does not grant new runtime permissions.

It is a unified control-surface governance specification only. Any implementation or authority expansion requires separate change control and board-governed ratification.
