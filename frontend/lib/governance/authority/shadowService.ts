import { appendAuthorityShadowDecision, type AuthorityShadowStoreDependencies } from "./shadowStore";
import {
  openOrGetAuthorityShadowOverrideCase,
  type AuthorityShadowCaseStoreDependencies,
} from "./shadowCaseStore";
import { evaluateAuthorityShadowDecision, type AuthorityShadowEvaluatorDependencies } from "./shadowEvaluator";
import type {
  AuthorityShadowDecisionRecord,
  AuthorityShadowEvaluationInput,
  AuthorityShadowEvaluationResult,
} from "./shadowTypes";

function parseBoolean(value: string | undefined) {
  return String(value || "").trim().toLowerCase() === "true";
}

type AuthorityLogger = Pick<typeof console, "info" | "warn" | "error">;

export type AuthorityShadowServiceDependencies = {
  now: () => Date;
  evaluate: (
    input: AuthorityShadowEvaluationInput,
    dependencyOverrides?: Partial<AuthorityShadowEvaluatorDependencies>
  ) => Promise<AuthorityShadowEvaluationResult>;
  appendDecision: (
    input: { evaluationInput: AuthorityShadowEvaluationInput; evaluationResult: AuthorityShadowEvaluationResult },
    dependencyOverrides?: Partial<AuthorityShadowStoreDependencies>
  ) => Promise<{ created: boolean; record: AuthorityShadowDecisionRecord }>;
  openCase: (
    input: {
      decision: AuthorityShadowDecisionRecord;
      actorId: string;
      actorRole: "system" | "admin" | "regulator" | "freight" | "supplier" | "service-partner" | "buyer";
      reasonCode?: string;
      metadata?: Record<string, unknown>;
    },
    dependencyOverrides?: Partial<AuthorityShadowCaseStoreDependencies>
  ) => Promise<any>;
  isShadowEnabled: () => boolean;
  isShadowCaseScaffoldingEnabled: () => boolean;
  logger: AuthorityLogger;
};

const defaultDependencies: AuthorityShadowServiceDependencies = {
  now: () => new Date(),
  evaluate: (input, deps) => evaluateAuthorityShadowDecision(input, deps),
  appendDecision: (input, deps) => appendAuthorityShadowDecision(input, deps),
  openCase: (input, deps) => openOrGetAuthorityShadowOverrideCase(input, deps),
  isShadowEnabled: () => parseBoolean(process.env.ENABLE_GOV04_AUTHORITY_SHADOW),
  isShadowCaseScaffoldingEnabled: () => parseBoolean(process.env.ENABLE_GOV04_AUTHORITY_SHADOW_CASE_SCAFFOLD),
  logger: console,
};

function resolveDependencies(
  overrides: Partial<AuthorityShadowServiceDependencies> = {}
): AuthorityShadowServiceDependencies {
  return {
    ...defaultDependencies,
    ...overrides,
  };
}

export type DispatchAuthorityShadowDecisionOutcome =
  | {
      processed: false;
      reason: "FLAG_DISABLED" | "FAILED";
      errorCode?: string;
      errorMessage?: string;
    }
  | {
      processed: true;
      evaluation: AuthorityShadowEvaluationResult;
      created: boolean;
      decision: AuthorityShadowDecisionRecord;
      caseScaffolded: boolean;
      caseCreated: boolean;
      caseId: string | null;
    };

export async function dispatchAuthorityShadowDecision(
  input: AuthorityShadowEvaluationInput,
  dependencyOverrides: Partial<AuthorityShadowServiceDependencies> = {}
): Promise<DispatchAuthorityShadowDecisionOutcome> {
  const deps = resolveDependencies(dependencyOverrides);
  if (!deps.isShadowEnabled()) {
    return {
      processed: false,
      reason: "FLAG_DISABLED",
    };
  }

  const evaluationInput: AuthorityShadowEvaluationInput = {
    ...input,
    decidedAtUtc: String(input.decidedAtUtc || deps.now().toISOString()),
  };

  const evaluation = await deps.evaluate(evaluationInput);
  const appended = await deps.appendDecision({
    evaluationInput,
    evaluationResult: evaluation,
  });

  let caseScaffolded = false;
  let caseCreated = false;
  let caseId: string | null = null;

  if (evaluation.wouldBlock && deps.isShadowCaseScaffoldingEnabled()) {
    caseScaffolded = true;
    const opened = await deps.openCase({
      decision: appended.record,
      actorId: String(evaluationInput.requestActorId || "system").trim() || "system",
      actorRole: evaluationInput.requestActorRole,
      reasonCode: evaluation.policyConflictCode || evaluation.reasonCodes[0] || "SHADOW_WOULD_BLOCK",
      metadata: {
        shadowEvaluatorVersion: evaluation.shadowEvaluatorVersion,
      },
    });
    caseCreated = Boolean(opened?.created);
    caseId = String(opened?.caseRecord?.caseId || "").trim() || null;
  }

  deps.logger.info("gov04_authority_shadow_decision_recorded", {
    tenantId: String(evaluationInput.tenantId || "").trim() || null,
    policyId: evaluation.policyId,
    policyVersionHash: evaluation.policyVersionHash,
    resource: evaluationInput.resource,
    action: evaluationInput.action,
    wouldDecision: evaluation.wouldDecision,
    wouldBlock: evaluation.wouldBlock,
    policyConflictCode: evaluation.policyConflictCode,
    decisionId: appended.record.decisionId,
    caseScaffolded,
    caseCreated,
    caseId,
  });

  return {
    processed: true,
    evaluation,
    created: appended.created,
    decision: appended.record,
    caseScaffolded,
    caseCreated,
    caseId,
  };
}

export async function dispatchAuthorityShadowDecisionFailOpen(
  input: AuthorityShadowEvaluationInput,
  dependencyOverrides: Partial<AuthorityShadowServiceDependencies> = {}
): Promise<DispatchAuthorityShadowDecisionOutcome> {
  const deps = resolveDependencies(dependencyOverrides);
  try {
    return await dispatchAuthorityShadowDecision(input, deps);
  } catch (error: any) {
    deps.logger.error("gov04_authority_shadow_decision_failed", {
      tenantId: String(input.tenantId || "").trim() || null,
      policyId: input.policyId,
      subjectActorId: input.subjectActorId,
      requestActorId: input.requestActorId,
      resource: input.resource,
      action: input.action,
      errorCode: String(error?.code || error?.message || "GOV04_AUTHORITY_SHADOW_FAILED"),
      errorMessage: String(error?.message || "shadow decision failed"),
    });

    return {
      processed: false,
      reason: "FAILED",
      errorCode: String(error?.code || "GOV04_AUTHORITY_SHADOW_FAILED"),
      errorMessage: String(error?.message || "shadow decision failed"),
    };
  }
}
