#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

TENANT_ID="${GOV04_AUTH_GUARD_TENANT_ID:-}"
POLICY_ID="${GOV04_AUTH_GUARD_POLICY_ID:-}"
MODE="${GOV04_AUTH_GUARD_MODE:-local}"
SOURCE_LABEL="${GOV04_AUTH_GUARD_SOURCE:-cli_local}"
OUTPUT_DIR="${GOV04_AUTH_GUARD_OUTPUT_DIR:-${FRONTEND_DIR}/artefacts/governance/authority-auto-guard}"

if [[ -z "${TENANT_ID}" ]]; then
  echo "GOV04_AUTH_GUARD_TENANT_ID is required" >&2
  exit 1
fi

if [[ -z "${POLICY_ID}" ]]; then
  echo "GOV04_AUTH_GUARD_POLICY_ID is required" >&2
  exit 1
fi

TIMESTAMP_UTC="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "${OUTPUT_DIR}"
OUTPUT_FILE="${OUTPUT_DIR}/authority-auto-guard-${TIMESTAMP_UTC}.json"

CMD=(
  npx
  tsx
  scripts/governance/authority-enforcement-auto-guard.ts
  --mode "${MODE}"
  --source "${SOURCE_LABEL}"
  --tenantId "${TENANT_ID}"
  --policyId "${POLICY_ID}"
  --out "${OUTPUT_FILE}"
)

if [[ -n "${GOV04_AUTH_GUARD_FROM_UTC:-}" ]]; then
  CMD+=(--from "${GOV04_AUTH_GUARD_FROM_UTC}")
fi
if [[ -n "${GOV04_AUTH_GUARD_TO_UTC:-}" ]]; then
  CMD+=(--to "${GOV04_AUTH_GUARD_TO_UTC}")
fi
if [[ -n "${GOV04_AUTH_GUARD_LIMIT:-}" ]]; then
  CMD+=(--limit "${GOV04_AUTH_GUARD_LIMIT}")
fi
if [[ -n "${GOV04_AUTH_GUARD_URL:-}" ]]; then
  CMD+=(--url "${GOV04_AUTH_GUARD_URL}")
fi
if [[ -n "${GOV04_AUTH_GUARD_SECRET:-}" ]]; then
  CMD+=(--secret "${GOV04_AUTH_GUARD_SECRET}")
fi
if [[ -n "${GOV04_AUTH_GUARD_TRIGGERED_BY:-}" ]]; then
  CMD+=(--triggeredBy "${GOV04_AUTH_GUARD_TRIGGERED_BY}")
fi

cd "${FRONTEND_DIR}"
set +e
"${CMD[@]}"
EXIT_CODE=$?
set -e

echo "Authority auto-guard output: ${OUTPUT_FILE}"
echo "Authority auto-guard exit code: ${EXIT_CODE}"

exit "${EXIT_CODE}"
