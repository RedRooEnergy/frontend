# EXT-10 — Shipment & Consignment Model (Conceptual)

Status: GOVERNANCE DRAFT
Extension: EXT-10 — Freight & Logistics Operator Experience
Implementation: NOT AUTHORIZED

## Purpose

This document defines the conceptual model for shipments and consignments
that are visible to Freight & Logistics Operators under EXT-10.

It describes what entities exist and how they relate,
not how they are stored or processed.

## Core Principles

- Shipments are created and owned by Core
- Consignments are components of shipments
- Logistics operators observe and signal status only
- No commercial or compliance authority is implied
- All interactions are auditable

## Shipment (Conceptual Entity)

A Shipment represents the end-to-end movement of goods.

Conceptual attributes:
- Shipment ID
- Shipment Type (International / Domestic)
- Origin and Destination (high-level)
- Current Shipment State
- Carrier Reference(s)
- Associated Order Reference
- Created Timestamp
- Closed Timestamp (if completed)

Shipments do not contain pricing, duties, or settlement logic.

## Consignment (Conceptual Entity)

A Consignment represents a physical grouping of goods within a shipment.

Conceptual attributes:
- Consignment ID
- Shipment ID (parent)
- Package Count / Container Reference
- Handling Instructions
- Current Consignment State
- Tracking Reference(s)

Consignments do not exist independently of shipments.

## Shipment States (Conceptual)

Example shipment lifecycle states:
- CREATED
- BOOKED
- IN_TRANSIT
- ARRIVED_AT_PORT
- CUSTOMS_PROCESSING
- CLEARED
- OUT_FOR_DELIVERY
- DELIVERED
- CLOSED

State transitions are enforced by Core.

## Consignment States (Conceptual)

Example consignment states:
- PACKED
- HANDED_OVER
- LOADED
- UNLOADED
- DAMAGED (reported)
- DELIVERED

Logistics operators may signal state changes,
but Core validates and applies them.

## Relationship to Other Domains

- Compliance checks may gate shipment progression
- Payments and settlement are independent of logistics status
- Customs declarations are handled outside EXT-10
- Evidence and documents are referenced, not modified

## Out of Scope

- Shipment creation or cancellation logic
- Carrier booking systems
- Real-time GPS or IoT tracking
- Customs clearance decisions
- Pricing, duties, taxes, or GST

These remain Core responsibilities.



Validation Checklist:

Model is conceptual only

Shipment vs consignment separation clear

Logistics authority constrained to signalling

No implementation detail introduced

Core ownership preserved

