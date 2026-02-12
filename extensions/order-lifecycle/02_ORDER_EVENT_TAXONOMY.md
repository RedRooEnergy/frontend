# EXT-ORDER-01 — Canonical Order Event Taxonomy

Version: v1.0
Status: PASS-1 LOCK TARGET

## Event Model

Each lifecycle transition must emit a canonical event with deterministic
attribution and immutable evidence references.

Fields:
- `eventCode`
- `actorRole`
- `immutableFields`
- `evidenceRefs`

## Canonical Events

| eventCode | actorRole | immutableFields | evidenceRefs |
| --- | --- | --- | --- |
| `ORDER_CREATED` | `buyer` or system order authority | `orderId`, `buyerId`, `createdAt`, `pricingSnapshotRef` | creation record, snapshot reference |
| `PAYMENT_HELD` | payments authority/system | `orderId`, `paymentRef`, `heldAt`, `amount` | payment evidence, escrow hold reference |
| `COMPLIANCE_PENDING` | compliance authority/system | `orderId`, `caseId`, `queuedAt` | compliance case reference |
| `COMPLIANCE_APPROVED` | compliance authority | `orderId`, `caseId`, `approvedAt`, `approverRole` | decision evidence, audit record |
| `COMPLIANCE_FAILED` | compliance authority | `orderId`, `caseId`, `failedAt`, `reasonCode` | failure evidence, audit record |
| `SHIPMENT_DISPATCHED` | freight authority/system | `orderId`, `shipmentId`, `dispatchAt`, `carrierRef` | freight dispatch evidence |
| `DELIVERY_CONFIRMED` | freight authority/system | `orderId`, `shipmentId`, `deliveredAt`, `deliveryRef` | POD/evidence document ref |
| `SETTLEMENT_PENDING` | finance authority/system | `orderId`, `financialCaseId`, `queuedAt` | settlement queue evidence |
| `SETTLEMENT_RELEASED` | finance authority | `orderId`, `financialCaseId`, `releasedAt`, `releaseRef` | settlement release evidence |
| `ORDER_CLOSED` | system lifecycle authority | `orderId`, `closedAt`, `closureRef` | closure evidence pack reference |
| `RETURN_REQUESTED` | buyer (case lane) | `orderId`, `caseId`, `requestedAt`, `reasonCode` | return case evidence |
| `DISPUTE_OPENED` | buyer/supplier/admin per case authority | `orderId`, `caseId`, `openedAt`, `reasonCode` | dispute case evidence |

## Event Governance Notes

- Event payloads are append-only.
- Event codes are immutable identifiers.
- `actorRole` is always explicit.
- `evidenceRefs` must point to immutable evidence artefacts.
