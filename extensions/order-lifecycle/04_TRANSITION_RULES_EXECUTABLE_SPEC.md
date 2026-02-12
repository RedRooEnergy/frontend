# EXT-ORDER-01 — Transition Rules (Executable Spec)

Version: v1.0
Status: PASS-1 LOCK TARGET

## Deterministic Rule Table

This table is the source reference for PASS-1 checks.

| fromState | toState | actorRole | requiredPreconditions | sideEffects |
| --- | --- | --- | --- | --- |
| `DRAFT` | `CREATED` | `buyer` (governed checkout authority) | pricing snapshot locked; order invariants valid | emit `ORDER_CREATED`; write audit record |
| `CREATED` | `PAYMENT_HELD` | payments authority/system | payment accepted; escrow hold successful | emit `PAYMENT_HELD`; write payment evidence refs |
| `PAYMENT_HELD` | `COMPLIANCE_PENDING` | system/compliance intake authority | payment hold reference exists | emit `COMPLIANCE_PENDING`; create compliance case link |
| `COMPLIANCE_PENDING` | `COMPLIANCE_APPROVED` | `compliance-authority` | compliance evidence complete; decision reason recorded | emit `COMPLIANCE_APPROVED`; write immutable decision audit |
| `COMPLIANCE_PENDING` | `COMPLIANCE_FAILED` | `compliance-authority` | failed evidence determination recorded | emit `COMPLIANCE_FAILED`; write immutable decision audit |
| `COMPLIANCE_APPROVED` | `FREIGHT_PENDING` | system/freight intake authority | compliance approved | emit freight intake event; write audit record |
| `FREIGHT_PENDING` | `IN_TRANSIT` | `freight` authority | shipment created; dispatch reference captured | emit `SHIPMENT_DISPATCHED`; write shipment evidence ref |
| `IN_TRANSIT` | `DELIVERED` | `freight` authority | delivery confirmed; delivery evidence present | emit `DELIVERY_CONFIRMED`; write delivery evidence ref |
| `DELIVERED` | `SETTLEMENT_PENDING` | system/finance intake authority | delivered event exists; no settlement release yet | emit `SETTLEMENT_PENDING`; create financial case link |
| `SETTLEMENT_PENDING` | `SETTLEMENT_RELEASED` | `finance-authority` | finance checks complete; release authorized | emit `SETTLEMENT_RELEASED`; write settlement evidence ref |
| `SETTLEMENT_RELEASED` | `CLOSED` | system lifecycle authority | settlement released; closure prerequisites satisfied | emit `ORDER_CLOSED`; attach evidence pack reference |

## Determinism Rules

- Every transition requires explicit `fromState` and `toState`.
- Every transition requires an allowed `actorRole`.
- Preconditions are mandatory and auditable.
- Side effects must emit canonical event codes and immutable evidence references.
- Any transition not listed here is denied.
