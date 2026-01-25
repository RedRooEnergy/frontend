# Category, Product Listing & Product Page Structure — Phase E

Version: v1.0 DRAFT
Governance State: CORE + EXTENSIONS LOCKED
Design Doctrine: LOCKED
Enforcement State: LIVE

Purpose:
Define the structural information hierarchy for category browsing,
product listings, and product detail pages in a governed marketplace.

---

## Category Pages

Purpose:
- Enable structured discovery
- Surface trust and compliance early

Structure:
- Category title and description
- Persistent left-hand category tree
- Sub-category grouping
- Product listing area

Trust Signals (Read-Only):
- Compliance requirement indicators
- Shipping & logistics availability
- Governance enforcement badge

Rules:
- No pricing manipulation
- No promotional urgency
- No hidden categories

---

## Product Listing Pages

Purpose:
- Allow comparison without ambiguity

Structure:
- Product list or grid
- Each product card includes:
  - Product name
  - Key specification summary
  - Locked price indicator (if available)
  - Compliance status indicator
  - Shipping availability indicator

Trust Signals:
- “Price locks at checkout”
- “Compliance verified before shipment”

Rules:
- No inline editing
- No speculative pricing
- Status indicators must reflect backend truth

---

## Product Detail Pages

Purpose:
- Support informed, governed purchase decisions

Structure:
- Product header:
  - Product name
  - Category path (breadcrumb)
- Core product information
- Compliance & certification section
- Pricing section:
  - Locked price indicator
  - Pricing snapshot reference (read-only)
- Shipping & logistics section
- Documentation & downloads
- Order action area (state-driven)

Trust & Enforcement Signals:
- Compliance status (Verified / Pending / Rejected)
- Pricing snapshot immutability
- Audit-backed transaction assurance

Rules:
- No editable pricing fields
- No bypass of compliance or enforcement
- Order actions must be backend-authorised

---

## Non-Negotiables

- All prices are representations, not controls
- Compliance status is authoritative and read-only
- Enforcement outcomes must be visible
- UI must not infer or predict approval
