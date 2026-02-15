# MASTER DASHBOARD GOVERNANCE CONTROL SURFACE — APPENDIX B
## PASS/FAIL Gates and CI Proof Requirements v1.0

Document ID: RRE-MASTER-DASHBOARD-GOV-SPEC-APPENDIX-B-v1.0  
Version: v1.0  
Status: DRAFT  
Classification: Governance Gate Appendix  
Runtime Authorization: NOT GRANTED

## 1) Global PASS/FAIL Gates

### Global FAIL Conditions

FAIL if any one is true:
- a dashboard mutation has no immutable audit linkage (`auditId` + ledger entry),
- an override class mutation executes without required approvals,
- payout/release path bypasses pricing snapshot or escrow integrity guards,
- restricted endpoint is reachable by unauthorized role,
- evidence or report artefact is missing hash or manifest,
- mandatory `justification` is missing/empty,
- mandatory `requestId` is missing/empty,
- mandatory `incidentId` for override class is missing/empty,
- endpoint exists but is not declared in Appendix A.
- a runtime role key appears outside the Appendix A closed role set.

### Global PASS Condition

PASS only when all global gates are verified by tests and CI artefacts.

## 2) Dashboard-Specific FAIL Gates

### 2.1 CEO / Executive Dashboard

FAIL if:
- any mutation endpoint is exposed under the executive dashboard surface,
- executive dashboard exposes raw mutable operational records instead of governed aggregates,
- executive exports are produced without reproducibility hash metadata.

### 2.2 Grand-Master Dashboard

FAIL if:
- any admin mutation path omits immutable audit evidence,
- any override class action executes with fewer than required approvals,
- any financial release/hold mutation bypasses snapshot verification constraints,
- any governance-critical subsystem FAIL state is hidden in admin status surfaces.

### 2.3 Installer Dashboard

FAIL if:
- installer routes can mutate order financial settlement fields,
- installer routes can alter escrow release state,
- installer routes can mutate pricing snapshot linkage fields,
- installer evidence actions omit artefact hash references.

### 2.4 Freight Dashboard

FAIL if:
- freight routes can mark escrow as released directly,
- freight routes can alter pricing snapshot linkage or settlement snapshot hashes,
- freight hold overrides execute without override-class requirements,
- freight evidence events are emitted without delivery/customs proof linkage.

### 2.5 Insurance Dashboard

FAIL if:
- insurance routes can execute payouts or refunds directly,
- claim recommendation routes bypass governed approval boundaries,
- claim evidence outputs are missing deterministic hash references.

### 2.6 Accreditation / Compliance Dashboard

FAIL if:
- accreditation routes can force-approve certificates outside policy constraints,
- accreditation routes can bypass core compliance controls,
- accreditation decisions are saved without rejection/reason evidence linkage,
- certification lifecycle changes are not auditable.

## 3) Minimum CI Proof Requirements by Dashboard

Each dashboard must produce, at minimum:
1. scorecard artefact JSON,
2. scorecard generation timestamp (UTC ISO-8601),
3. SHA-256 hash of scorecard artefact,
4. rule-check results for dashboard-specific gates,
5. evidence of endpoint inventory compliance.
6. evidence of closed role-set compliance.

### 3.1 Required Proof Matrix

| Dashboard | Minimum CI Artefact | Minimum Required Fields |
| --- | --- | --- |
| CEO / Executive | `scorecards/executive-dashboard.scorecard.json` | `overall`, `checks[]`, `generatedAtUtc`, `sha256` |
| Grand-Master Admin | `scorecards/admin-dashboard.scorecard.json` | `overall`, `checks[]`, `generatedAtUtc`, `sha256`, `auditCoverage` |
| Installer | `scorecards/installer-dashboard.scorecard.json` | `overall`, `checks[]`, `generatedAtUtc`, `sha256`, `financialMutationGuard=PASS` |
| Freight | `scorecards/freight-dashboard.scorecard.json` | `overall`, `checks[]`, `generatedAtUtc`, `sha256`, `escrowBypassGuard=PASS` |
| Insurance | `scorecards/insurance-dashboard.scorecard.json` | `overall`, `checks[]`, `generatedAtUtc`, `sha256`, `noPayoutExecutionGuard=PASS` |
| Accreditation / Compliance | `scorecards/accreditation-dashboard.scorecard.json` | `overall`, `checks[]`, `generatedAtUtc`, `sha256`, `policyBypassGuard=PASS` |

If a dashboard is not yet implemented, CI must emit explicit `NO_DATA` status and block any “activation complete” declaration for that dashboard.

### 3.2 Mandatory Automation Checks

CI evidence must include:
- automated route enumeration scan output with undeclared-route findings count across:
  - `frontend/app/api/**`,
  - `backend/routes/**` (where present),
- closed role-key scan output with unknown-role findings count,
- immutable-ledger linkage check for mutation receipts (`auditId` presence and resolvability).

## 4) Evidence and Timestamp Enforcement

All CI proof artefacts must:
- use UTC timestamps,
- include immutable commit SHA references,
- include hash manifests where multiple artefacts are bundled,
- be retained under governance evidence retention policy.

## 5) Gate Determination

- Dashboard Gate PASS: global + dashboard-specific gates all PASS with required CI proofs.
- Dashboard Gate FAIL: any global or dashboard-specific gate FAIL, missing proof artefact, or missing hash/timestamp evidence.

No partial PASS classification is allowed for governance activation decisions.
