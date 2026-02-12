# EXT-ORDER-01 — Canonical Order Lifecycle States

Version: v1.0
Status: PASS-1 LOCK TARGET

## Canonical OrderState Enum

```ts
export type OrderState =
  | "DRAFT"
  | "CREATED"
  | "PAYMENT_HELD"
  | "COMPLIANCE_PENDING"
  | "COMPLIANCE_APPROVED"
  | "COMPLIANCE_FAILED"
  | "FREIGHT_PENDING"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "SETTLEMENT_PENDING"
  | "SETTLEMENT_RELEASED"
  | "CLOSED";
```

## State Definitions

| State | Meaning | Notes |
| --- | --- | --- |
| `DRAFT` | Cart/intention exists but no committed order authority | Pre-order, non-authoritative |
| `CREATED` | Order created with immutable order identifier and snapshot references | First authoritative state |
| `PAYMENT_HELD` | Payment accepted and funds held per escrow policy | Requires payment evidence |
| `COMPLIANCE_PENDING` | Compliance review required before operational progression | Gate state |
| `COMPLIANCE_APPROVED` | Compliance passed | Allows freight lane entry |
| `COMPLIANCE_FAILED` | Compliance rejected/failed | Blocking state until governed resolution |
| `FREIGHT_PENDING` | Awaiting freight dispatch/assignment | Operational gate |
| `IN_TRANSIT` | Shipment dispatched and moving through logistics lane | Event-driven updates only |
| `DELIVERED` | Delivery confirmed under governed evidence | Required for settlement progression |
| `SETTLEMENT_PENDING` | Delivery complete and settlement checks pending | Finance gate |
| `SETTLEMENT_RELEASED` | Settlement released under finance authority rules | Pre-close financial completion |
| `CLOSED` | Lifecycle complete with immutable closure evidence | Terminal lifecycle state |

## Side-Lanes (Linked Cases, Not Primary Order States)

Returns and disputes are case lanes linked to an order. They are not free-form
primary order state replacements.

- Return lane: linked case with own governed case state model
- Dispute lane: linked case with own governed case state model

Order primary state remains canonical while linked cases are resolved.
