# EXT-ORDER-01 — PASS-1 Verification Checklist

Version: v1.0
Status: ACTIVE

PASS-1 checks are deterministic and file-backed.
Evaluation is done by file existence and stable string anchors.

## ORDER-01 — Order state machine docs exist and include required states
Required evidence files:
- `extensions/order-lifecycle/01_ORDER_LIFECYCLE_STATES.md`
PASS:
- File exists and contains all canonical states (`DRAFT`, `CREATED`, `PAYMENT_HELD`, `COMPLIANCE_PENDING`, `COMPLIANCE_APPROVED`, `COMPLIANCE_FAILED`, `FREIGHT_PENDING`, `IN_TRANSIT`, `DELIVERED`, `SETTLEMENT_PENDING`, `SETTLEMENT_RELEASED`, `CLOSED`).
FAIL:
- File missing or one or more required state anchors missing.
NOT_BUILT:
- Not used in PASS-1.
NOT_APPLICABLE:
- Not used in PASS-1.

## ORDER-02 — Event taxonomy exists and includes required canonical event codes
Required evidence files:
- `extensions/order-lifecycle/02_ORDER_EVENT_TAXONOMY.md`
PASS:
- File exists and includes `ORDER_CREATED`, `PAYMENT_HELD`, `COMPLIANCE_APPROVED`, `SHIPMENT_DISPATCHED`, `DELIVERY_CONFIRMED`, `SETTLEMENT_RELEASED`, `RETURN_REQUESTED`, `DISPUTE_OPENED`.
FAIL:
- File missing or any required event code anchor missing.
NOT_BUILT:
- Not used in PASS-1.
NOT_APPLICABLE:
- Not used in PASS-1.

## ORDER-03 — Authority matrix explicitly denies free-form transitions
Required evidence files:
- `extensions/order-lifecycle/03_AUTHORITY_MATRIX.md`
PASS:
- File exists and contains `No free-form order status editing` and `Admin is never a free actor` anchors.
FAIL:
- File missing or either denial anchor absent.
NOT_BUILT:
- Not used in PASS-1.
NOT_APPLICABLE:
- Not used in PASS-1.

## ORDER-04 — Transition rules table includes escrow/payment gating
Required evidence files:
- `extensions/order-lifecycle/04_TRANSITION_RULES_EXECUTABLE_SPEC.md`
PASS:
- File exists and contains `pricing snapshot locked`, `PAYMENT_HELD`, `SETTLEMENT_PENDING`, and `SETTLEMENT_RELEASED` anchors.
FAIL:
- File missing or required gating anchors absent.
NOT_BUILT:
- Not used in PASS-1.
NOT_APPLICABLE:
- Not used in PASS-1.

## ORDER-05 — Buyer order UI is projection-only
Required evidence files:
- `frontend/app/buyer/order/[id]/page.tsx`
- `frontend/app/buyer/orders/page.tsx`
PASS:
- Buyer order surfaces contain `Status is read-only from enforcement` and `Actions controlled by backend` anchors.
FAIL:
- Missing files or missing projection-only anchors.
NOT_BUILT:
- Not used in PASS-1.
NOT_APPLICABLE:
- Not used in PASS-1.

## ORDER-06 — Admin audit UI anchors append-only immutable posture
Required evidence files:
- `frontend/app/admin/audit/page.tsx`
PASS:
- File exists and includes `append-only and immutable` anchor.
FAIL:
- File missing or immutable audit anchor absent.
NOT_BUILT:
- Not used in PASS-1.
NOT_APPLICABLE:
- Not used in PASS-1.

## ORDER-07 — Payment snapshot governance references are present
Required evidence files:
- `docs/12.04_escrow-lifecycle-settlement-trigger-rules.md`
- `extensions/payments-escrow/15_API_CONTRACTS.md`
PASS:
- Docs include pricing snapshot + escrow gating anchors (`Pricing snapshot`, `pricingSnapshotId`, `Pricing snapshot is locked`).
FAIL:
- Any required file missing or required anchors absent.
NOT_BUILT:
- Not used in PASS-1.
NOT_APPLICABLE:
- Not used in PASS-1.

## ORDER-08 — Freight gating references exist in governed freight docs
Required evidence files:
- `extensions/freight-logistics/SHIPMENT_AND_CONSIGNMENT_MODEL.md`
- `extensions/logistics-ddp/01_LIFECYCLE_STATES.md`
PASS:
- Freight governance docs exist and include shipment/freight lane anchors (`Shipment`, `DDP`, `lifecycle states`).
FAIL:
- Any required file missing or required anchors absent.
NOT_BUILT:
- Not used in PASS-1.
NOT_APPLICABLE:
- Not used in PASS-1.

## ORDER-09 — Compliance gating references exist in authority docs
Required evidence files:
- `extensions/compliance-authority/contracts/compliance.states.md`
- `extensions/compliance-authority/AUTH_AND_AUTHORITY_BOUNDARIES.md`
PASS:
- Compliance docs include approval/rejection anchors (`COMPLIANCE_APPROVED`, `COMPLIANCE_REJECTED`) and authority boundary controls.
FAIL:
- Any required file missing or required anchors absent.
NOT_BUILT:
- Not used in PASS-1.
NOT_APPLICABLE:
- Not used in PASS-1.

## ORDER-10 — Returns/disputes are linked cases, not silent state edits
Required evidence files:
- `extensions/order-lifecycle/01_ORDER_LIFECYCLE_STATES.md`
- `extensions/returns-refunds-disputes/CASE_TYPES_STATES_AND_OWNERSHIP.md`
PASS:
- Lifecycle doc includes linked-case lane anchor and returns/disputes case governance doc exists.
FAIL:
- Missing linked-case lane language or missing case governance file.
NOT_BUILT:
- Not used in PASS-1.
NOT_APPLICABLE:
- Not used in PASS-1.

## ORDER-11 — Evidence immutability rules are referenced
Required evidence files:
- `extensions/order-lifecycle/05_AUDIT_AND_OBSERVABILITY.md`
- `extensions/documents-records/EVIDENCE_UPLOAD_AND_IMMUTABILITY_RULES.md`
PASS:
- Audit/observability doc references immutable artefacts and document immutability policy file exists.
FAIL:
- Missing observability references or missing immutability policy file.
NOT_BUILT:
- Not used in PASS-1.
NOT_APPLICABLE:
- Not used in PASS-1.

## ORDER-12 — Extension lock doctrine exists
Required evidence files:
- `extensions/order-lifecycle/EXTENSION_LOCK.md`
PASS:
- Extension lock doc exists with `Status: LOCKED ON PASS-1` and formal change-control anchors.
FAIL:
- Lock doctrine missing or required lock/change-control anchors absent.
NOT_BUILT:
- Not used in PASS-1.
NOT_APPLICABLE:
- Not used in PASS-1.
