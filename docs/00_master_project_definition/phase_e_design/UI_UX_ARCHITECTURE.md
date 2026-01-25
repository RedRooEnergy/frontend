# UI / UX Architecture — Phase E

Version: v1.0 DRAFT
Governance State: CORE + EXTENSIONS LOCKED
Design Doctrine: LOCKED
Enforcement State: LIVE

Purpose:
Confirm the high-level UI architecture that governs layout regions,
navigation mechanics, and information flow across the platform.

---

## Global Layout Regions

All authenticated and public pages share the following regions:

1. Header (Global)
   - Logo
   - Primary navigation entry points
   - Account access (role-aware)

2. Left-Hand Navigation (Persistent)
   - Category tree (marketplace)
   - Extension-driven sections
   - Collapsible, non-overlapping

3. Main Content Area
   - Page-specific content
   - Modular horizontal sections

4. Right Utility Rail (Contextual)
   - Cart summary (buyer)
   - Order status (buyer)
   - Compliance hints (supplier)
   - Alerts (admin)

5. Footer (Global)
   - Governance & trust links
   - Compliance statements
   - Legal & audit references

---

## Page Architecture Types

Public Pages:
- Linear, narrative-driven
- Trust-first information flow

Marketplace Pages:
- Hierarchical
- Category → Sub-category → Product

Dashboard Pages (Buyer/Supplier/Admin):
- Summary-first
- Drill-down secondary
- Read-only truth reflection

---

## Interaction Rules

- Navigation is predictable and persistent
- No modal-driven core workflows
- State changes are reflected, not assumed
- Enforcement outcomes are visible, not hidden

---

## Non-Negotiables

- Left-hand navigation is mandatory for marketplace pages
- No alternative navigation paradigms
- Cart and checkout are state-driven, not exploratory
- UI never overrides enforcement
