# EXT-FREIGHT-02 — Verification Checklist (PASS-2)

Version: v1.0
Status: ACTIVE

PASS-2 checklist includes static/contract checks and runtime integration checks.
Runtime checks execute only in integration mode.

## Static/Contract Checks (always run)

### FREIGHT-OP-01 — PASS-2 plan exists
Required evidence files:
- `extensions/freight-logistics/OPERATIONAL_VERIFICATION_PLAN_PASS2.md`
PASS:
- File exists.
FAIL:
- File missing.

### FREIGHT-OP-02 — DDP lifecycle docs exist and reference customs clearance gating
Required evidence files:
- `extensions/logistics-ddp/01_LIFECYCLE_STATES.md`
- `extensions/freight-logistics/OPERATIONAL_VERIFICATION_PLAN_PASS2.md`
PASS:
- DDP lifecycle doc exists and PASS-2 plan includes `CUSTOMS_CLEARED` checkpoint/gating.
FAIL:
- Missing file or customs gating anchors absent.

### FREIGHT-OP-03 — Freight shipment model references sea + air identifiers
Required evidence files:
- `extensions/freight-logistics/SHIPMENT_AND_CONSIGNMENT_MODEL.md`
- `extensions/freight-logistics/OPERATIONAL_VERIFICATION_PLAN_PASS2.md`
PASS:
- Shipment model exists and PASS-2 plan declares `containerId/bookingRef` and `airwayBillRef`.
FAIL:
- Missing shipment model or missing sea/air identifier anchors.

### FREIGHT-OP-04 — Order lifecycle docs reference freight and delivery->settlement gating
Required evidence files:
- `extensions/order-lifecycle/01_ORDER_LIFECYCLE_STATES.md`
- `extensions/order-lifecycle/04_TRANSITION_RULES_EXECUTABLE_SPEC.md`
PASS:
- Order lifecycle docs include freight states and `DELIVERED -> SETTLEMENT_PENDING` gating.
FAIL:
- Missing files or missing gating anchors.

## Runtime Integration Checks (strict when BASE_URL provided)

Runtime checks are `NOT_APPLICABLE` in static mode.
If `PASS2_BASE_URL` is provided (integration mode), runtime checks are strict and any miss is `FAIL`.

### FREIGHT-OP-05 — Frontend reachable
Required endpoint/page:
- `<PASS2_BASE_URL>/`
Expected anchors:
- Basic HTML response and marketplace brand anchor.
FAIL semantics:
- Non-200 or no expected anchor in integration mode.

### FREIGHT-OP-06 — Buyer order detail page reachable for known test order
Required endpoint/page:
- `<PASS2_BASE_URL>/buyer/order/<PASS2_TEST_ORDER_ID>`
Expected anchors:
- Order detail marker and order identifier presence.
FAIL semantics:
- Non-200 or missing anchor in integration mode.

### FREIGHT-OP-07 — Freight lane state visible on buyer order projection
Required endpoint/page:
- `<PASS2_BASE_URL>/buyer/order/<PASS2_TEST_ORDER_ID>`
Expected anchors:
- Freight/order progression state anchor (e.g. `IN_TRANSIT`, `DELIVERED`, `In Progress`).
FAIL semantics:
- Missing state anchors in integration mode.

### FREIGHT-OP-08 — Sea shipment identifier visible when sea path selected
Required endpoint/page:
- `<PASS2_BASE_URL>/buyer/order/<PASS2_TEST_ORDER_ID>`
Expected anchors:
- `containerId`, `container`, `bookingRef`, or `Bill of Lading` anchor.
FAIL semantics:
- Missing sea identifier anchors in integration mode.

### FREIGHT-OP-09 — Air shipment identifier visible when air path selected
Required endpoint/page:
- `<PASS2_BASE_URL>/buyer/order/<PASS2_TEST_ORDER_ID>`
Expected anchors:
- `airwayBillRef`, `AWB`, or `Air Waybill` anchor.
FAIL semantics:
- Missing air identifier anchors in integration mode.

### FREIGHT-OP-10 — Customs cleared marker exists when DDP required
Required endpoint/page:
- `<PASS2_BASE_URL>/buyer/order/<PASS2_TEST_ORDER_ID>`
Expected anchors:
- `CUSTOMS_CLEARED`, `Customs Cleared`, or DDP clearance marker.
FAIL semantics:
- Missing customs-cleared marker in integration mode.

### FREIGHT-OP-11 — Delivery confirmed includes POD evidence reference
Required endpoint/page:
- `<PASS2_BASE_URL>/buyer/order/<PASS2_TEST_ORDER_ID>`
Expected anchors:
- `Proof of Delivery`, `POD`, or delivery evidence/confirmation reference.
FAIL semantics:
- Missing POD/delivery evidence anchor in integration mode.

### FREIGHT-OP-12 — Settlement pending blocked until delivery confirmed (anchor)
Required endpoint/page:
- `<PASS2_BASE_URL>/buyer/order/<PASS2_TEST_ORDER_ID>`
Expected anchors:
- Rule text anchor indicating settlement requires delivery confirmation.
FAIL semantics:
- Missing rule anchor in integration mode.

### FREIGHT-OP-13 — Settlement released only after delivery confirmed (anchor)
Required endpoint/page:
- `<PASS2_BASE_URL>/buyer/order/<PASS2_TEST_ORDER_ID>`
Expected anchors:
- Rule text anchor linking settlement release to confirmed delivery.
FAIL semantics:
- Missing rule anchor in integration mode.

### FREIGHT-OP-14 — No admin free-form status edit UI
Required endpoint/page:
- `<PASS2_BASE_URL>/admin/audit`
Expected anchors:
- Read-only audit view; no free-form status edit controls.
FAIL semantics:
- Edit/override status controls visible in integration mode.

### FREIGHT-OP-15 — Evidence references appear immutable/append-only
Required endpoint/page:
- `<PASS2_BASE_URL>/admin/audit`
Expected anchors:
- `append-only` / `immutable` anchors.
FAIL semantics:
- Missing immutability anchors in integration mode.

### FREIGHT-OP-16 — PASS-2 run emits artefacts and summary SHA-256
Required artefacts:
- `artefacts/freight-operational-pass2/scorecard.freight-operational-pass2.<runId>.json`
- `artefacts/freight-operational-pass2/<runId>/summary.freight-operational-pass2.<runId>.json`
- `artefacts/freight-operational-pass2/<runId>/summary.freight-operational-pass2.<runId>.json.sha256`
PASS:
- Files exist and SHA-256 manifest matches summary content hash.
FAIL:
- Missing artefacts or SHA mismatch.

## Status Semantics

- Static checks use `PASS` or `FAIL`.
- Runtime checks use:
  - `NOT_APPLICABLE` when integration mode is not enabled
  - `PASS`/`FAIL` when integration mode is enabled
- Overall PASS-2 scorecard result is `FAIL` on any `FAIL` or `NOT_BUILT`.
  `NOT_APPLICABLE` is neutral.
