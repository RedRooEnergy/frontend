# EXT-12 — Metrics, KPIs & Data Sources (Conceptual)

Status: GOVERNANCE DRAFT
Extension: EXT-12 — Platform Analytics, Reporting & Oversight
Implementation: NOT AUTHORIZED

## Purpose

This document defines the conceptual metrics and KPIs
available through EXT-12 and the Core data sources
from which they may be derived.

Metrics are observational summaries only.
They must never drive operational or decision logic.

## Core Principles

- Metrics reflect Core truth only
- Metrics are derived, not authoritative
- Aggregation before exposure
- No metric overrides system state
- Reproducibility is mandatory

## Metric Categories

### Platform Activity Metrics
Examples:
- Orders created per period
- Orders completed vs cancelled
- Active buyers and suppliers (aggregated)
- Marketplace throughput trends

### Financial Metrics (Aggregated)
Examples:
- Gross transaction volume
- Escrow balances (aggregated)
- Settlements completed per period
- Refund and dispute rates

### Compliance Metrics
Examples:
- Compliance approvals vs rejections
- Certification expiry trends
- Average compliance resolution time
- Audit finding frequency

### Logistics & Operations Metrics
Examples:
- Shipment volume by status
- Delivery lead-time trends
- Exception and delay frequency
- Consignment handling events

### Platform Health Metrics
Examples:
- System uptime
- API error rates
- Workflow completion latency
- SLA adherence

## KPI Characteristics

All KPIs:
- Are time-bound
- Are clearly defined
- Use immutable source data
- Are reproducible on demand
- Are versioned when definitions change

No KPI may be silently redefined.

## Approved Data Sources (Core-Owned)

Metrics may only be derived from:
- Orders and order lifecycle records
- Pricing snapshots and payment records
- Escrow and settlement records
- Compliance cases and decisions
- Shipment and logistics records
- Audit logs and system events

External data sources are prohibited unless
explicitly approved via Change Control.

## Data Restrictions

- No raw PII exposure
- Aggregation required for sensitive data
- Minimum cohort sizes enforced
- Regulator-only views explicitly labelled

## Out of Scope

- Predictive analytics
- Machine learning models
- Automated decision thresholds
- Data correction or backfilling
- Real-time operational alerting

These remain Core or future-extension responsibilities.



Validation Checklist:

Metrics are observational only

KPI definitions explicit and bounded

Approved data sources enumerated

No implementation or calculation logic

Governance-first constraints preserved

