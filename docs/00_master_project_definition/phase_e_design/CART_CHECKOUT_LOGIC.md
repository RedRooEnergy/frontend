# Cart & Checkout UX Logic — Phase E

Version: v1.0 DRAFT
Governance State: CORE + EXTENSIONS LOCKED
Design Doctrine: LOCKED
Enforcement State: LIVE

Purpose:
Define the state-driven logic governing cart and checkout UX,
ensuring transparency, correctness, and enforcement alignment.

---

## Cart States

### Cart: Empty
Characteristics:
- No items present
- Clear guidance to browse marketplace

Allowed Actions:
- Navigate to categories
- Search products

Disallowed:
- Checkout initiation

---

### Cart: Items Added (Pre-Snapshot)
Characteristics:
- Items present
- Pricing not yet locked

Indicators:
- “Price will lock at checkout”

Allowed Actions:
- Remove items
- Proceed to checkout

Disallowed:
- Manual price adjustments

---

### Cart: Pricing Snapshot Created
Characteristics:
- Pricing snapshot ID generated
- Prices locked

Indicators:
- “Locked Price” badge
- Snapshot reference visible

Allowed Actions:
- Proceed through checkout steps
- Review snapshot details

Disallowed:
- Quantity changes that invalidate snapshot
- Price modification

---

## Checkout States

### Checkout: Initial
Characteristics:
- Snapshot validated
- Compliance pre-check performed

Allowed Actions:
- Confirm shipping details
- Continue checkout

Disallowed:
- Bypass of compliance requirements

---

### Checkout: Compliance Pending
Characteristics:
- Compliance verification incomplete

Indicators:
- “Compliance verification in progress”

Allowed Actions:
- Wait
- View requirements

Disallowed:
- Payment submission

---

### Checkout: Ready for Payment
Characteristics:
- Compliance verified
- Snapshot confirmed

Allowed Actions:
- Submit payment

Disallowed:
- Price renegotiation
- Item substitution

---

### Checkout: Payment Submitted
Characteristics:
- Payment intent created
- Order in processing state

Allowed Actions:
- View order confirmation

Disallowed:
- Any cart modification

---

## Error Handling Philosophy

Principles:
- Errors are factual, not apologetic
- Enforcement failures explain “why”
- No retry loops that imply flexibility

Examples:
- “Price has changed — snapshot expired”
- “Compliance verification required before payment”
- “Action not permitted under governed rules”

---

## Non-Negotiables

- Cart and checkout reflect backend state only
- No optimistic success messaging
- No hidden enforcement steps
- All transitions must be backend-authorised
