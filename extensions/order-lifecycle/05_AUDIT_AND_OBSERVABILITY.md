# EXT-ORDER-01 — Audit and Observability

Version: v1.0
Status: PASS-1 LOCK TARGET

## Immutable Artefacts

For lifecycle audit execution, required immutable outputs are:

- JSON scorecard (`PASS`/`FAIL` by check with overall result)
- One-page summary PDF derived from deterministic HTML
- SHA-256 hash file for PDF integrity verification

## Evidence Linkage Rules

- Every transition event must include evidence references.
- Evidence references must remain stable and append-only.
- Scorecard, summary PDF, and SHA artefacts must be reproducible.

## PASS-1 Observability Constraints

- PASS-1 focuses on deterministic governance + projection invariants.
- Frontend surfaces are projection-only and not mutation authorities.
- No regulator email flows are triggered by this extension.
- No ad hoc backend probing is required for PASS-1 checklist execution.

## Required Cross-References

- `extensions/documents-records/EVIDENCE_UPLOAD_AND_IMMUTABILITY_RULES.md`
- `extensions/finance-settlement/AUDIT_AND_OBSERVABILITY.md`
- `extensions/compliance-authority/AUDIT_AND_OBSERVABILITY.md`
- `extensions/freight-logistics/AUDIT_AND_OBSERVABILITY.md`
