import {
  FREIGHT_AUDIT_RULE_SET_VERSION,
  type FreightAuditEscalationLevel,
  type FreightAuditRuleId,
  type FreightAuditSeverity,
  type FreightAuditTriggerEvent,
  listFreightAuditRulesByTrigger,
} from "./FreightAuditRules";

export type FreightAuditEvaluationContext = Record<string, unknown>;

export type FreightRuleEvaluation = {
  ruleId: FreightAuditRuleId;
  passed: boolean;
  severity: FreightAuditSeverity;
  escalationLevel: FreightAuditEscalationLevel;
  missingEvidenceCodes: string[];
  evaluatedAtUtc: string;
};

export type FreightAuditEvaluationSummary = {
  totalRules: number;
  failedRules: number;
  criticalFailures: number;
  blockingFailures: number;
};

export type FreightAuditEvaluationResult = {
  triggerEvent: FreightAuditTriggerEvent;
  ruleSetVersion: string;
  evaluatedAtUtc: string;
  evaluations: FreightRuleEvaluation[];
  summary: FreightAuditEvaluationSummary;
};

export type FreightRuleEvaluator = (context: FreightAuditEvaluationContext) => boolean;

export const freightEvaluators: Record<string, FreightRuleEvaluator> = {
  validateFreightPartnerAuthority: () => true,
  validateFreightQuoteIntegrity: () => true,
  validateOrderShipmentBinding: () => true,
  validatePickupCustodyEvidence: () => true,
  validateInternationalTransitMilestones: () => true,
  validateCustomsDutyGst: () => true,
  validateLastMilePod: () => true,
  validateInsuranceCoverageAndClaims: () => true,
  validateEscrowFreightGate: () => true,
  validateExceptionLifecycle: () => true,
  validateApiIntegrityAndIsolation: () => true,
  validateRegulatorEvidenceReplay: () => true,
};

function normalizeEvidenceCodes(context: FreightAuditEvaluationContext) {
  const raw = context.availableEvidenceCodes;
  if (!Array.isArray(raw)) return null;
  const normalized = raw
    .map((code) => String(code || "").trim())
    .filter((code) => code.length > 0);
  normalized.sort((a, b) => a.localeCompare(b));
  return new Set(normalized);
}

export function evaluateFreightEvent(params: {
  triggerEvent: FreightAuditTriggerEvent;
  context: FreightAuditEvaluationContext;
}): FreightAuditEvaluationResult {
  const triggerRules = listFreightAuditRulesByTrigger(params.triggerEvent)
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id));

  const evidenceCodes = normalizeEvidenceCodes(params.context);
  const evaluatedAtUtc = new Date().toISOString();

  const evaluations: FreightRuleEvaluation[] = triggerRules.map((rule) => {
    const evaluator = freightEvaluators[rule.condition.evaluatorKey];
    const evaluatorPassed = evaluator ? evaluator(params.context) : false;

    const missingEvidenceCodes =
      evidenceCodes === null
        ? []
        : rule.requiredEvidence
            .filter((requirement) => requirement.required)
            .map((requirement) => requirement.code)
            .filter((code) => !evidenceCodes.has(code))
            .sort((a, b) => a.localeCompare(b));

    const passed = evaluatorPassed && missingEvidenceCodes.length === 0;

    return {
      ruleId: rule.id,
      passed,
      severity: rule.severity,
      escalationLevel: rule.escalationLevel,
      missingEvidenceCodes,
      evaluatedAtUtc,
    };
  });

  const summary = evaluations.reduce(
    (acc, evaluation) => {
      acc.totalRules += 1;
      if (!evaluation.passed) {
        acc.failedRules += 1;
        if (evaluation.severity === "CRITICAL") acc.criticalFailures += 1;
        if (evaluation.escalationLevel === "BLOCK_ESCROW") acc.blockingFailures += 1;
      }
      return acc;
    },
    {
      totalRules: 0,
      failedRules: 0,
      criticalFailures: 0,
      blockingFailures: 0,
    } satisfies FreightAuditEvaluationSummary
  );

  return {
    triggerEvent: params.triggerEvent,
    ruleSetVersion: FREIGHT_AUDIT_RULE_SET_VERSION,
    evaluatedAtUtc,
    evaluations,
    summary,
  };
}
