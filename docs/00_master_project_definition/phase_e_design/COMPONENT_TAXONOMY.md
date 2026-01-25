# Component Taxonomy — Phase E

Version: v1.0 DRAFT
Governance State: CORE + EXTENSIONS LOCKED
Design Doctrine: LOCKED
UI/UX Architecture: LOCKED
Page Types: LOCKED
Navigation Structure: LOCKED
Enforcement State: LIVE

Purpose:
Define the canonical frontend component taxonomy and the
responsibility boundaries of each component type.

---

## Component Categories

### 1. Layout Components

Responsibility:
- Define page regions and structural layout
- Arrange child components

Examples:
- AppLayout
- Header
- Footer
- LeftNavigation
- UtilityRail
- PageContainer

Rules:
- No business logic
- No enforcement logic
- No data mutation

---

### 2. Navigation Components

Responsibility:
- Enable movement between routes
- Reflect visibility rules

Examples:
- NavItem
- CategoryTree
- Breadcrumbs
- Pagination

Rules:
- Never assume permission
- Disabled states must be explicit
- No decision-making authority

---

### 3. Display Components

Responsibility:
- Render enforced state and data
- Present read-only information

Examples:
- StatusBadge
- LockedPriceIndicator
- ComplianceStatus
- AuditEventRow
- SnapshotReference

Rules:
- Purely presentational
- Must accept state as input
- No internal enforcement logic

---

### 4. Interaction Components

Responsibility:
- Initiate user intent
- Pass intent to backend APIs

Examples:
- ActionButton
- UploadControl
- FilterControl
- SearchInput

Rules:
- Must handle backend rejection gracefully
- Must not simulate success
- Disabled state must explain why

---

### 5. Form Components

Responsibility:
- Collect user input
- Submit to governed endpoints

Examples:
- AddressForm
- DocumentUploadForm
- ContactForm

Rules:
- Validation is UX-level only
- Authority remains server-side
- Submission outcome must reflect backend truth

---

### 6. Data Containers

Responsibility:
- Fetch data
- Pass data to children

Examples:
- OrdersContainer
- ProductsContainer
- AuditLogContainer

Rules:
- No rendering
- No enforcement logic
- No mutation outside defined APIs

---

## Component Governance Rules

- Components do not enforce rules
- Components do not override backend decisions
- Components do not hide enforcement failures
- All authority flows from backend → UI

---

## Non-Negotiables

- Every UI element maps to a component category
- No multi-responsibility components
- No styling decisions at taxonomy level
- Taxonomy must support later theming cleanly
