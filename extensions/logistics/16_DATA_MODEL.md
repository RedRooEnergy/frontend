# EXT-06 — Logistics Data Model

Status: GOVERNANCE DRAFT

Entity: LogisticsRecord

Fields:
- logisticsId (string, immutable)
- supplierId (string)
- orderId (string)
- hsCode (string)
- originCountry (string)
- destinationCountry (string)
- dutyAmount (number)
- gstAmount (number)
- currency (string)
- status (enum: CREATED | IN_TRANSIT | DELIVERED | VERIFIED)
- trackingEvents (append-only array)
- createdAt (timestamp)
- verifiedAt (timestamp | null)

Rules:
- logisticsId is immutable once issued
- trackingEvents are append-only
- status transitions must be validated
- all mutations require audit emission
- no deletes permitted

