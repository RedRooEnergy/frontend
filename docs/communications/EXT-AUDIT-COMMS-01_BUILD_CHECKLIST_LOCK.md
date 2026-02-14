# EXT-AUDIT-COMMS-01 Build Checklist Lock
Version: v1.0
Status: LOCKED CONSTRAINTS

No mutation surfaces: send/retry/resend/acknowledge/resolve

No unified mutable datastore

No history rewrite/normalization

No evidence row dropping/dedup-by-deletion

No synthetic authority events

CompositeEvidenceHash includes scopeLabel; scope+completeness always displayed

Regulator slice suppression fixed; admin slice still read-only

No secrets/tokens/PII
