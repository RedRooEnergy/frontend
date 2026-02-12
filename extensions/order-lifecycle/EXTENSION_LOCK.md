# EXT-ORDER-01 — EXTENSION LOCK

Version: v1.0
Status: LOCKED ON PASS-1

## Lock Rule

EXT-ORDER-01 is considered LOCKED when:

- `VERIFICATION_CHECKLIST_PASS1.md` evaluates all checks as `PASS`
- PASS-1 audit scorecard overall result is `PASS`
- Governance artefacts remain immutable and referenced by release tag

## Change Control Requirement

After lock, any modification to:

- canonical order states
- canonical event codes
- authority matrix
- transition rules
- PASS-1 checklist semantics

requires formal change control and re-validation of PASS-1.

## Non-Negotiables

- No free-form order status edits
- No frontend runtime lifecycle mutation authority
- No bypass of immutable evidence requirements
- No hidden transition paths outside executable spec
