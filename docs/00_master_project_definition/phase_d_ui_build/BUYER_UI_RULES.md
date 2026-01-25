# Buyer UI Rules

Governance State: CORE + EXTENSIONS LOCKED
Enforcement State: LIVE

Rules:
- Prices displayed must come from Pricing Snapshot APIs
- UI must display a "Locked Price" indicator when snapshot is present
- Order status is a read-only reflection of enforced system state
- Buyer cannot edit compliance or shipping data
- UI must never simulate success if backend rejects an action
- Every rejection must be shown with a clear, factual message

UI Role:
UI is an observer and coordinator, not an authority.
