# GOV-CHAT-01 — Platform Governance Aggregator Rule Contract
Version: v1.0
Status: DESIGN LOCK (Static Governance Contract)
Classification: Internal Governance / Operational Communication Integrity
Authority Impact: NONE
Mutation Rights Introduced: NONE
Runtime Authorization: NOT GRANTED
Change Control: REQUIRED

## 1. Objective

Define a deterministic Platform Governance Aggregator (PGA) rule contract for EXT-CHAT-01 so chatbot governance posture can be scored and enforced without introducing runtime coupling or state mutation.

This contract governs aggregator interpretation only. It does not modify chat runtime behavior.

## 2. Rule Identity

- Rule ID: `GOV-CHAT-01`
- Rule Name: `Operational Chat Governance Integrity`
- Category: `Platform / Communication Integrity`
- Severity: `CRITICAL`
- Scoring Mode: `Binary PASS/FAIL`
- Authority Expansion: `NONE`
- Evaluation Mode: `Static governance state consumption`

## 3. Aggregator Input Source Contract

Primary input source:
- `GET /api/governance/chatbot/status`

Required backing artefact source:
- `scorecards/chatbot.scorecard.json`

Path contract:
- Scorecard path must resolve to platform root scorecard artefact.
- Missing scorecard is a rule failure condition.

## 4. PASS / FAIL Derivation Rules

`GOV-CHAT-01` returns `PASS` only if all conditions hold:
- chatbot status endpoint responds successfully,
- status payload includes `overall` field,
- `overall = PASS`,
- `failCount = 0`,
- all checks in scorecard status payload are `PASS`,
- scorecard artefact exists at expected path,
- badge and status surfaces are semantically consistent.

`GOV-CHAT-01` returns `FAIL` if any condition is false.

No partial credit, no warning state, no soft-pass.

## 5. Aggregator Weighting Rule

Weighting policy:
- Binary critical control (recommended and locked in this contract).
- On `FAIL`, platform governance state must be treated as degraded.

Governance impact recommendation:
- `CRITICAL` rule contribution.
- `GOV-CHAT-01 FAIL` blocks platform PASS-3 governance declaration.

If a numeric deduction is introduced later, it must be defined via formal change control and board amendment.

## 6. Failure Severity Classification

Failure severity: `CRITICAL`

Effect:
- Rule failure is governance-blocking for PASS-3 platform closure.
- No override path permitted outside formal change control.

## 7. Drift Detection Conditions

The following conditions must force `FAIL`:
- Scorecard `overall = FAIL`.
- Scorecard artefact missing.
- Badge mismatch with status (e.g., badge claims PASS while status indicates FAIL/NO_DATA).
- CI gate bypass attempt (workflow omission, suppression, or non-enforcement of chatbot PASS requirement).
- Status endpoint unavailable or malformed payload.

## 8. Non-Coupling Clause

The Platform Governance Aggregator may consume chat governance state.

The Platform Governance Aggregator must not:
- modify chat threads,
- mutate chat scorecard data,
- alter chat subsystem state,
- introduce reverse runtime dependency from chat operations to aggregator outcomes.

No reverse dependency is allowed.

## 9. Explicit Boundary Statement

`GOV-CHAT-01` does not authorize:
- chat runtime mutation expansion,
- chat feature modifications,
- new operational chat endpoints,
- authority elevation in buyer/supplier/admin/regulator flows,
- external chat platform integrations.

This rule is governance scoring and drift detection only.

## 10. Formal Change Requirement

Any change to:
- PASS/FAIL semantics,
- severity class,
- weighting behavior,
- drift conditions,
- input source contract,
- CI enforcement expectations,

requires:
- formal change request,
- version increment,
- registry and close-pack synchronization,
- board amendment/ratification.

No exceptions.

## 11. Next Controlled Step

After this design-lock contract is approved:
1. implement static `GOV-CHAT-01` evaluation in PGA code,
2. integrate badge/score behavior per contract,
3. activate CI fail-gate,
4. finalize close-pack and ratification references.

Implementation must remain non-coupled to chat runtime state mutation.
