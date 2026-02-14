# Regulator Walkthrough — WeChat Channel Governance
Version: v1.0
Status: Regulator Read-Ahead

## 1) Why WeChat Is Referenced but Not Embedded
RRE treats WeChat as an external communications channel. Embedding uncontrolled live chat would weaken deterministic evidence boundaries and blur authoritative decision provenance.

Therefore:
- WeChat sends governed prompts and notifications.
- Authoritative actions occur only in RRE authenticated workflows.

## 2) What Is Stored
For outbound dispatches RRE stores:
- eventCode
- correlation references (order/compliance/shipment/payment)
- recipient binding reference
- deterministic rendered payload hash
- template contract hash
- provider status events

For inbound callbacks RRE stores:
- inbound payload hash
- received timestamp
- bounded processing result code

## 3) What Is Not Allowed
- Free-form send endpoint
- Personal chat scraping/mirroring
- Unauthenticated state mutation from inbound message text
- Regulator auto-send channeling

## 4) Replay and Verification Flow
Auditor can:
1. Select an `orderId`/`shipmentId`/`paymentId`.
2. Query linked WeChat dispatch records.
3. Verify each dispatch eventCode is in locked taxonomy.
4. Re-render payload from canonical template inputs and compare SHA-256 hash.
5. Confirm action completion inside RRE core routes and logs.

## 5) Assurance Statement
WeChat is a governed notification accelerator, not the authoritative source of truth.

RRE core ledgers remain authoritative for compliance, freight, payment, and settlement outcomes.
