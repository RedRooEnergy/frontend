# Email Template Governance Rules (EXT-EMAIL-01)

Version: v1.0  
Status: LOCKED

## Status Gates
- DRAFT: preview only, never sent  
- APPROVED: non‑prod only  
- LOCKED: production required  
- RETIRED: never sent (audit readable only)

## Required Fields
templateId, eventCode, roleScope, language, subjectTemplate, bodyTemplateHtml, bodyTemplateText, allowedVariables, version, status.

## Variable Whitelisting
Only variables listed in allowedVariables may be used. Rendering fails on any unapproved variable.

## Deterministic Rendering
Same inputs must produce byte‑identical outputs. Outputs are SHA‑256 hashed.

## Template Changes
LOCKED templates cannot be edited. Changes require a new version and governance approval.

## Language Rules
Supported: EN, ZH_CN (fallback to EN).

## Prohibited Content
No secrets, no credentials, no non‑governed links, no cross‑tenant data.
