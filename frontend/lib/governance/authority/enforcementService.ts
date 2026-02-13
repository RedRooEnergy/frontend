import {
  isAuthorityEnforcementEnabled,
  isAuthorityEnforcementKillSwitchEnabled,
  isAuthorityEnforcementStrictMode,
  resolveAuthorityEnforcementAllowlistConfig,
} from "./config";
import {
  appendAuthorityEnforcementDecision,
  type AuthorityEnforcementStoreDependencies,
} from "./enforcementStore";
import type {
  AuthorityEnforcementDecisionRecord,
  AuthorityEnforcementPreconditionState,
} from "./enforcementTypes";
import { computeAuthorityShadowDecisionHash } from "./shadowStore";
import {
  appendAuthorityShadowDecision,
  type AuthorityShadowStoreDependencies,
} from "./shadowStore";
import {
  evaluateAuthorityShadowDecision,
  type AuthorityShadowEvaluatorDependencies,
} from "./shadowEvaluator";
import type {
  AuthorityShadowDecisionRecord,
  AuthorityShadowEvaluationInput,
  AuthorityShadowEvaluationResult,
} from "./shadowTypes";

export type AuthorityEnforcementServiceDependencies = {
  now: () => Date;
  evaluateShadow: (
    input: AuthorityShadowEvaluationInput,
    dependencyOverrides?: Partial<AuthorityShadowEvaluatorDependencies>
  ) => Promise<AuthorityShadowEvaluationResult>;
  appendShadowDecision: (
    input: {
      evaluationInput: AuthorityShadowEvaluationInput;
      evaluationResult: AuthorityShadowEvaluationResult;
    },
    dependencyOverrides?: Partial<AuthorityShadowStoreDependencies>
  ) => Promise<{ created: boolean; record: AuthorityShadowDecisionRecord }>;
  appendEnforcementDecision: (
    input: {
      tenantId?: string | null;
      policyId: string;
      policyVersionHash?: string | null;
      subjectActorId: string;
      requestActorId: string;
      requestActorRole: AuthorityShadowEvaluationInput["requestActorRole"];
      approverActorId?: string | null;
      approverActorRole?: AuthorityShadowEvaluationInput["approverActorRole"];
      delegationId?: string | null;
      resource: string;
      action: string;
      shadowDecisionId: string;
      shadowDecisionHashSha256: string;
      decisionHashSha256: string;
      enforcementResult: "ALLOW" | "BLOCK";
      shadowVsEnforcementDivergence?: boolean;
      responseMutationCode?: string | null;
      decidedAtUtc: string;
      metadata?: Record<string, unknown>;
    },
    dependencyOverrides?: Partial<AuthorityEnforcementStoreDependencies>
  ) => Promise<{ created: boolean; record: AuthorityEnforcementDecisionRecord }>;
  resolvePreconditions: (input: {
    tenantId?: string | null;
    requestActorRole: string;
    resource: string;
    action: string;
    policyVersionHash?: string | null;
  }) => AuthorityEnforcementPreconditionState;
  logger: Pick<typeof console, "info" | "warn" | "error">;
};

const defaultDependencies: AuthorityEnforcementServiceDependencies = {
  now: () => new Date(),
  evaluateShadow: (input, deps) => evaluateAuthorityShadowDecision(input, deps),
  appendShadowDecision: (input, deps) => appendAuthorityShadowDecision(input, deps),
  appendEnforcementDecision: (input, deps) => appendAuthorityEnforcementDecision(input, deps),
  resolvePreconditions: (input) => resolveAuthorityEnforcementPreconditions(input, process.env),
  logger: console,
};

function resolveDependencies(
  overrides: Partial<AuthorityEnforcementServiceDependencies> = {}
): AuthorityEnforcementServiceDependencies {
  return {
    ...defaultDependencies,
    ...overrides,
  };
}

function normalizeResourceAction(resource: string, action: string) {
  return `${String(resource || "").trim()}|${String(action || "").trim()}`;
}

export function resolveAuthorityEnforcementPreconditions(
  input: {
    tenantId?: string | null;
    requestActorRole: string;
    resource: string;
    action: string;
    policyVersionHash?: string | null;
  },
  env: NodeJS.ProcessEnv = process.env
): AuthorityEnforcementPreconditionState {
  const enabled = isAuthorityEnforcementEnabled(env);
  const killSwitch = isAuthorityEnforcementKillSwitchEnabled(env);
  const strictMode = isAuthorityEnforcementStrictMode(env);

  if (killSwitch) {
    return {
      enabled,
      killSwitch,
      strictMode,
      bypassed: true,
      bypassReason: "KILL_SWITCH_ENABLED",
    };
  }

  if (!enabled) {
    return {
      enabled,
      killSwitch,
      strictMode,
      bypassed: true,
      bypassReason: "ENFORCEMENT_FLAG_DISABLED",
    };
  }

  const allowlists = resolveAuthorityEnforcementAllowlistConfig(env);

  const tenantId = String(input.tenantId || "").trim();
  const role = String(input.requestActorRole || "").trim().toLowerCase();
  const resourceAction = normalizeResourceAction(input.resource, input.action);
  const policyVersionHash = String(input.policyVersionHash || "").trim().toLowerCase();

  if (!tenantId || !allowlists.tenantAllowlist.has(tenantId)) {
    return {
      enabled,
      killSwitch,
      strictMode,
      bypassed: true,
      bypassReason: "TENANT_NOT_ALLOWLISTED",
    };
  }

  if (!role || !allowlists.roleAllowlist.has(role)) {
    return {
      enabled,
      killSwitch,
      strictMode,
      bypassed: true,
      bypassReason: "ROLE_NOT_ALLOWLISTED",
    };
  }

  if (!allowlists.resourceActionAllowlist.has(resourceAction)) {
    return {
      enabled,
      killSwitch,
      strictMode,
      bypassed: true,
      bypassReason: "RESOURCE_ACTION_NOT_ALLOWLISTED",
    };
  }

  if (!policyVersionHash) {
    return {
      enabled,
      killSwitch,
      strictMode,
      bypassed: true,
      bypassReason: "POLICY_VERSION_NOT_PROVIDED",
    };
  }

  if (!allowlists.policyVersionAllowlist.has(policyVersionHash)) {
    return {
      enabled,
      killSwitch,
      strictMode,
      bypassed: true,
      bypassReason: "POLICY_VERSION_NOT_ALLOWLISTED",
    };
  }

  return {
    enabled,
    killSwitch,
    strictMode,
    bypassed: false,
    bypassReason: null,
  };
}

export type AuthorityEnforcementOutcome = {
  preconditions: AuthorityEnforcementPreconditionState;
  shadow: {
    created: boolean;
    decision: AuthorityShadowDecisionRecord;
    evaluation: AuthorityShadowEvaluationResult;
  } | null;
  enforcement: {
    applied: boolean;
    result: "ALLOW" | "BLOCK";
    created: boolean;
    decision: AuthorityEnforcementDecisionRecord | null;
    responseMutationCode: string | null;
    strictMode: boolean;
    divergenceDetected: boolean;
    bypassReason: AuthorityEnforcementPreconditionState["bypassReason"] | null;
    failureCode: string | null;
  };
};

export async function evaluateAuthorityEnforcementDecision(
  input: AuthorityShadowEvaluationInput,
  dependencyOverrides: Partial<AuthorityEnforcementServiceDependencies> = {}
): Promise<AuthorityEnforcementOutcome> {
  const deps = resolveDependencies(dependencyOverrides);
  const decidedAtUtc = String(input.decidedAtUtc || deps.now().toISOString());

  const preconditions = deps.resolvePreconditions({
    tenantId: input.tenantId,
    requestActorRole: input.requestActorRole,
    resource: input.resource,
    action: input.action,
    policyVersionHash: input.policyVersionHash || null,
  });

  const evaluationInput: AuthorityShadowEvaluationInput = {
    ...input,
    decidedAtUtc,
  };

  let shadowEvaluation: AuthorityShadowEvaluationResult;
  let shadowAppended: { created: boolean; record: AuthorityShadowDecisionRecord };

  try {
    shadowEvaluation = await deps.evaluateShadow(evaluationInput);
    shadowAppended = await deps.appendShadowDecision({
      evaluationInput,
      evaluationResult: shadowEvaluation,
    });
  } catch (error: any) {
    deps.logger.error("gov04_authority_enforcement_shadow_persist_failed", {
      tenantId: String(input.tenantId || "").trim() || null,
      policyId: input.policyId,
      resource: input.resource,
      action: input.action,
      requestActorId: input.requestActorId,
      errorCode: String(error?.code || error?.message || "AUTHORITY_ENFORCEMENT_SHADOW_PERSIST_FAILED"),
      errorMessage: String(error?.message || "shadow persist failed"),
    });

    if (preconditions.strictMode && !preconditions.bypassed) {
      return {
        preconditions,
        shadow: null,
        enforcement: {
          applied: true,
          result: "BLOCK",
          created: false,
          decision: null,
          responseMutationCode: "HTTP_403_AUTHZ_BLOCK_STRICT_INTERNAL_ERROR",
          strictMode: true,
          divergenceDetected: false,
          bypassReason: null,
          failureCode: "AUTHORITY_ENFORCEMENT_SHADOW_PERSIST_FAILED",
        },
      };
    }

    return {
      preconditions,
      shadow: null,
      enforcement: {
        applied: false,
        result: "ALLOW",
        created: false,
        decision: null,
        responseMutationCode: null,
        strictMode: preconditions.strictMode,
        divergenceDetected: false,
        bypassReason: preconditions.bypassReason,
        failureCode: "AUTHORITY_ENFORCEMENT_SHADOW_PERSIST_FAILED",
      },
    };
  }

  const shadow = {
    created: shadowAppended.created,
    decision: shadowAppended.record,
    evaluation: shadowEvaluation,
  };

  if (preconditions.bypassed) {
    return {
      preconditions,
      shadow,
      enforcement: {
        applied: false,
        result: "ALLOW",
        created: false,
        decision: null,
        responseMutationCode: null,
        strictMode: preconditions.strictMode,
        divergenceDetected: false,
        bypassReason: preconditions.bypassReason,
        failureCode: null,
      },
    };
  }

  let enforcementEvaluation: AuthorityShadowEvaluationResult;
  try {
    enforcementEvaluation = await deps.evaluateShadow(evaluationInput);
  } catch (error: any) {
    deps.logger.error("gov04_authority_enforcement_eval_failed", {
      tenantId: String(input.tenantId || "").trim() || null,
      policyId: input.policyId,
      resource: input.resource,
      action: input.action,
      requestActorId: input.requestActorId,
      errorCode: String(error?.code || error?.message || "AUTHORITY_ENFORCEMENT_EVALUATION_FAILED"),
      errorMessage: String(error?.message || "enforcement eval failed"),
    });

    if (preconditions.strictMode) {
      return {
        preconditions,
        shadow,
        enforcement: {
          applied: true,
          result: "BLOCK",
          created: false,
          decision: null,
          responseMutationCode: "HTTP_403_AUTHZ_BLOCK_STRICT_INTERNAL_ERROR",
          strictMode: true,
          divergenceDetected: false,
          bypassReason: null,
          failureCode: "AUTHORITY_ENFORCEMENT_EVALUATION_FAILED",
        },
      };
    }

    return {
      preconditions,
      shadow,
      enforcement: {
        applied: false,
        result: "ALLOW",
        created: false,
        decision: null,
        responseMutationCode: null,
        strictMode: false,
        divergenceDetected: false,
        bypassReason: null,
        failureCode: "AUTHORITY_ENFORCEMENT_EVALUATION_FAILED",
      },
    };
  }

  const shadowDecisionHash = shadow.decision.decisionHashSha256;
  const shadowEvalDecisionHash = computeAuthorityShadowDecisionHash({
    evaluationInput,
    evaluationResult: shadowEvaluation,
  });
  const enforcementEvalDecisionHash = computeAuthorityShadowDecisionHash({
    evaluationInput,
    evaluationResult: enforcementEvaluation,
  });

  const divergenceDetected =
    shadowDecisionHash !== shadowEvalDecisionHash ||
    shadowDecisionHash !== enforcementEvalDecisionHash;

  if (divergenceDetected) {
    deps.logger.error("gov04_authority_enforcement_dual_write_divergence", {
      tenantId: String(input.tenantId || "").trim() || null,
      policyId: input.policyId,
      resource: input.resource,
      action: input.action,
      requestActorId: input.requestActorId,
      shadowDecisionId: shadow.decision.decisionId,
      shadowDecisionHashSha256: shadowDecisionHash,
      shadowEvaluationHashSha256: shadowEvalDecisionHash,
      enforcementEvaluationHashSha256: enforcementEvalDecisionHash,
    });

    const mismatchResult = preconditions.strictMode ? "BLOCK" : "ALLOW";
    const mismatchResponseMutationCode = preconditions.strictMode
      ? "HTTP_403_AUTHZ_BLOCK_STRICT_DUAL_WRITE_MISMATCH"
      : null;
    try {
      const appended = await deps.appendEnforcementDecision({
        tenantId: input.tenantId,
        policyId: shadowEvaluation.policyId,
        policyVersionHash: shadowEvaluation.policyVersionHash,
        subjectActorId: input.subjectActorId,
        requestActorId: input.requestActorId,
        requestActorRole: input.requestActorRole,
        approverActorId: input.approverActorId || null,
        approverActorRole: input.approverActorRole || null,
        delegationId: input.delegationId || null,
        resource: input.resource,
        action: input.action,
        shadowDecisionId: shadow.decision.decisionId,
        shadowDecisionHashSha256: shadowDecisionHash,
        decisionHashSha256: shadowDecisionHash,
        enforcementResult: mismatchResult,
        shadowVsEnforcementDivergence: true,
        responseMutationCode: mismatchResponseMutationCode,
        decidedAtUtc,
        metadata: {
          shadowEvaluatorVersion: shadowEvaluation.shadowEvaluatorVersion,
          enforcementEvaluationVersion: enforcementEvaluation.shadowEvaluatorVersion,
          shadowEvaluationHashSha256: shadowEvalDecisionHash,
          enforcementEvaluationHashSha256: enforcementEvalDecisionHash,
        },
      });

      return {
        preconditions,
        shadow,
        enforcement: {
          applied: preconditions.strictMode,
          result: mismatchResult,
          created: appended.created,
          decision: appended.record,
          responseMutationCode: mismatchResponseMutationCode,
          strictMode: preconditions.strictMode,
          divergenceDetected: true,
          bypassReason: null,
          failureCode: "AUTHORITY_ENFORCEMENT_DUAL_WRITE_MISMATCH",
        },
      };
    } catch (error: any) {
      deps.logger.error("gov04_authority_enforcement_divergence_persist_failed", {
        tenantId: String(input.tenantId || "").trim() || null,
        policyId: input.policyId,
        resource: input.resource,
        action: input.action,
        requestActorId: input.requestActorId,
        shadowDecisionId: shadow.decision.decisionId,
        errorCode: String(error?.code || error?.message || "AUTHORITY_ENFORCEMENT_DIVERGENCE_PERSIST_FAILED"),
        errorMessage: String(error?.message || "divergence persist failed"),
      });

      if (preconditions.strictMode) {
        return {
          preconditions,
          shadow,
          enforcement: {
            applied: true,
            result: "BLOCK",
            created: false,
            decision: null,
            responseMutationCode: "HTTP_403_AUTHZ_BLOCK_STRICT_DUAL_WRITE_MISMATCH",
            strictMode: true,
            divergenceDetected: true,
            bypassReason: null,
            failureCode: "AUTHORITY_ENFORCEMENT_DUAL_WRITE_MISMATCH",
          },
        };
      }

      return {
        preconditions,
        shadow,
        enforcement: {
          applied: false,
          result: "ALLOW",
          created: false,
          decision: null,
          responseMutationCode: null,
          strictMode: false,
          divergenceDetected: true,
          bypassReason: null,
          failureCode: "AUTHORITY_ENFORCEMENT_DUAL_WRITE_MISMATCH",
        },
      };
    }
  }

  const enforcementResult = enforcementEvaluation.wouldBlock ? "BLOCK" : "ALLOW";
  const responseMutationCode =
    enforcementResult === "BLOCK" ? "HTTP_403_AUTHZ_BLOCK" : null;

  try {
    const appended = await deps.appendEnforcementDecision({
      tenantId: input.tenantId,
      policyId: enforcementEvaluation.policyId,
      policyVersionHash: enforcementEvaluation.policyVersionHash,
      subjectActorId: input.subjectActorId,
      requestActorId: input.requestActorId,
      requestActorRole: input.requestActorRole,
      approverActorId: input.approverActorId || null,
      approverActorRole: input.approverActorRole || null,
      delegationId: input.delegationId || null,
      resource: input.resource,
      action: input.action,
      shadowDecisionId: shadow.decision.decisionId,
      shadowDecisionHashSha256: shadowDecisionHash,
      decisionHashSha256: enforcementEvalDecisionHash,
      enforcementResult,
      shadowVsEnforcementDivergence: false,
      responseMutationCode,
      decidedAtUtc,
      metadata: {
        shadowEvaluatorVersion: shadowEvaluation.shadowEvaluatorVersion,
        enforcementEvaluationVersion: enforcementEvaluation.shadowEvaluatorVersion,
      },
    });

    return {
      preconditions,
      shadow,
      enforcement: {
        applied: true,
        result: enforcementResult,
        created: appended.created,
        decision: appended.record,
        responseMutationCode,
        strictMode: preconditions.strictMode,
        divergenceDetected: false,
        bypassReason: null,
        failureCode: null,
      },
    };
  } catch (error: any) {
    deps.logger.error("gov04_authority_enforcement_persist_failed", {
      tenantId: String(input.tenantId || "").trim() || null,
      policyId: input.policyId,
      resource: input.resource,
      action: input.action,
      requestActorId: input.requestActorId,
      shadowDecisionId: shadow.decision.decisionId,
      errorCode: String(error?.code || error?.message || "AUTHORITY_ENFORCEMENT_PERSIST_FAILED"),
      errorMessage: String(error?.message || "enforcement persist failed"),
    });

    if (preconditions.strictMode) {
      return {
        preconditions,
        shadow,
        enforcement: {
          applied: true,
          result: "BLOCK",
          created: false,
          decision: null,
          responseMutationCode: "HTTP_403_AUTHZ_BLOCK_STRICT_INTERNAL_ERROR",
          strictMode: true,
          divergenceDetected: false,
          bypassReason: null,
          failureCode: "AUTHORITY_ENFORCEMENT_PERSIST_FAILED",
        },
      };
    }

    return {
      preconditions,
      shadow,
      enforcement: {
        applied: false,
        result: "ALLOW",
        created: false,
        decision: null,
        responseMutationCode: null,
        strictMode: false,
        divergenceDetected: false,
        bypassReason: null,
        failureCode: "AUTHORITY_ENFORCEMENT_PERSIST_FAILED",
      },
    };
  }
}
