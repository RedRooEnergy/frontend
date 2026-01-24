/**
 * Compliance Decision History Projection Adapter
 * Authority-visible decision history only.
 */

export function projectDecisionHistory(coreDecisions: any[]) {
  if (!Array.isArray(coreDecisions)) {
    return [];
  }

  return coreDecisions.map(decision => ({
    decisionId: decision.id,
    decisionType: decision.type,
    outcome: decision.outcome,
    rationale: decision.rationale,
    issuedBy: decision.issuedBy,
    issuedAt: decision.issuedAt,
    effectiveFrom: decision.effectiveFrom,
    effectiveUntil: decision.effectiveUntil ?? null
  }));
}
