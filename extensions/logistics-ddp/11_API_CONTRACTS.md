# EXT-03 — Logistics, Freight & DDP
## API Contracts (Governance-Locked)

This document defines the external API contracts for the Logistics & DDP extension.
All contracts are read-only from the perspective of clients; mutations are system-governed.

---

## POST /logistics/draft

Purpose:
Create a new logistics draft for freight and landed-cost calculation.

Request:
- supplierId (string)
- productIds (string[])
- originCountry (string)
- destinationCountry (string)
- hsCodes (string[])
- dimensions (length, width, height, weight)
- declaredValue (number)
- currency (string)

Response:
- logisticsDraftId
- status = DRAFT

Authorization:
- SYSTEM only

---

## POST /logistics/verify

Purpose:
Verify duties, taxes, and compliance prior to dispatch.

Request:
- logisticsDraftId (string)

Response:
- status = VERIFIED
- dutyAmount
- gstAmount
- freightCost
- totalLandedCost

Authorization:
- COMPLIANCE_AUTHORITY only

---

## POST /logistics/dispatch

Purpose:
Dispatch a verified shipment.

Request:
- logisticsDraftId (string)
- carrier (string)

Response:
- shipmentId
- trackingNumber (optional)
- status = IN_TRANSIT

Authorization:
- SYSTEM only

---

## GET /logistics/{id}

Purpose:
Retrieve logistics draft or shipment details.

Response:
- Full LogisticsDraft or Shipment object

Authorization:
- SYSTEM
- SUPPLIER (own records only)
- COMPLIANCE_AUTHORITY
- ADMIN

---

## Contract Enforcement Rules

- No API may mutate state without passing authorization and audit enforcement.
- Clients cannot bypass DDP calculations.
- API responses must reflect authoritative system state only.
