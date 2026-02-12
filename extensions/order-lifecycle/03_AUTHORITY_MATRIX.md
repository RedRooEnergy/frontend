# EXT-ORDER-01 — Authority Matrix

Version: v1.0
Status: PASS-1 LOCK TARGET

## Rule

No free-form order status editing is permitted.
All `From -> To` transitions require explicit authority.

## Transition Authority Matrix

| From -> To | ActorRole | Allowed | Notes |
| --- | --- | --- | --- |
| `DRAFT -> CREATED` | `buyer` via governed checkout authority | Yes | Requires snapshot + order creation invariants |
| `CREATED -> PAYMENT_HELD` | payments authority/system | Yes | Buyer/supplier direct mutation denied |
| `PAYMENT_HELD -> COMPLIANCE_PENDING` | system/compliance intake authority | Yes | Triggered by governed compliance policy |
| `COMPLIANCE_PENDING -> COMPLIANCE_APPROVED` | `compliance-authority` | Yes | Decision evidence required |
| `COMPLIANCE_PENDING -> COMPLIANCE_FAILED` | `compliance-authority` | Yes | Reason code + evidence required |
| `COMPLIANCE_APPROVED -> FREIGHT_PENDING` | system/freight intake authority | Yes | Compliance pass precondition |
| `FREIGHT_PENDING -> IN_TRANSIT` | `freight` authority | Yes | Shipment dispatch evidence required |
| `IN_TRANSIT -> DELIVERED` | `freight` authority | Yes | Delivery confirmation evidence required |
| `DELIVERED -> SETTLEMENT_PENDING` | system/finance intake authority | Yes | Delivery confirmed precondition |
| `SETTLEMENT_PENDING -> SETTLEMENT_RELEASED` | `finance-authority` | Yes | Settlement release decision required |
| `SETTLEMENT_RELEASED -> CLOSED` | system lifecycle authority | Yes | Closure evidence pack reference required |
| `* -> *` (direct edit) | `admin` free-form | No | Admin is constrained to defined authority paths only |
| `* -> *` (direct edit) | `buyer`, `supplier`, `installer`, `freight` | No | Direct status edit denied outside transition authority |

## Admin Constraint

Admin is never a free actor for order status mutation.
Admin actions must map to an explicitly allowed transition authority path.
