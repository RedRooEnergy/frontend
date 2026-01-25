# Navigation Structure — Phase E

Version: v1.0 DRAFT
Governance State: CORE + EXTENSIONS LOCKED
Design Doctrine: LOCKED
UI/UX Architecture: LOCKED
Page Types: LOCKED
Enforcement State: LIVE

Purpose:
Define the canonical navigation structure and hierarchy used
across the platform.

---

## Global Navigation Zones

### 1. Header Navigation (Global)

Visible on all pages.

Contents:
- Platform logo (links to homepage)
- Primary marketplace entry point
- Role-aware access point (Sign in / Dashboard)
- Cart access (buyer only)

Rules:
- Header navigation provides orientation, not deep navigation
- No dropdown mega-menus in header
- No enforcement logic in header

---

### 2. Left-Hand Navigation (Persistent — Marketplace)

Visible on:
- Marketplace browsing pages
- Product detail pages
- Buyer and Supplier dashboards

Structure:
- Hierarchical category tree
- Expand / collapse per category
- One level expanded at a time

Contents:
- Top-level categories
- Sub-categories
- Extension-linked sections (where applicable)

Rules:
- Left-hand navigation is mandatory
- No duplication of header navigation
- Category order is governed, not personalised

---

### 3. Contextual Utility Navigation (Right Rail)

Visible contextually based on role and page type.

Examples:
- Cart summary (buyer)
- Order status indicators (buyer)
- Compliance status (supplier)
- Alerts (admin)

Rules:
- Utility rail provides context, not control
- No primary actions placed here
- Read-only indicators only

---

### 4. Footer Navigation (Global)

Visible on all pages.

Contents:
- Governance & Trust links
- Compliance information
- Legal references
- Contact information

Rules:
- Footer reinforces trust and authority
- No functional workflows initiated from footer

---

## Role-Based Visibility Rules

- Public users see: Header + Footer only
- Buyers see: Header + Left Nav + Contextual Utility
- Suppliers see: Header + Left Nav + Contextual Utility
- Admins see: Header + Left Nav + Contextual Utility

Visibility affects **what is shown**, not **what is allowed**.

---

## Non-Negotiables

- Navigation must never imply permission
- Disabled navigation items must explain why
- No alternative navigation patterns permitted
- Navigation reflects governance truthfully
