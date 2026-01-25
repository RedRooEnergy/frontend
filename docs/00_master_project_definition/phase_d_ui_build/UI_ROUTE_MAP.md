# UI Route Map — Phase D

Version: v0.1 DRAFT
Governance State: CORE + EXTENSIONS LOCKED
Enforcement State: LIVE

Purpose:
Define all frontend routes and dashboards, mapped explicitly to
roles and governed extensions.

Public Routes:
- /                    (Homepage)
- /about               (About / Trust / Governance)
- /how-it-works        (Process Overview)
- /marketplace         (Product Catalogue - governed)
- /compliance          (Compliance & Trust)
- /contact

Buyer Routes (Authenticated):
- /buyer/dashboard
- /buyer/orders
- /buyer/order/:id
- /buyer/documents

Supplier Routes (Authenticated):
- /supplier/dashboard
- /supplier/products
- /supplier/orders
- /supplier/compliance

Admin / Governance Routes:
- /admin/dashboard
- /admin/audit
- /admin/extensions
- /admin/compliance

Rules:
- Routes expose information only — enforcement is backend-driven
- UI must not assume permissions
- UI must reflect enforcement outcomes truthfully
