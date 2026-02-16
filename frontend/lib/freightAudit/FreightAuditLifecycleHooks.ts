import {
  runFreightAuditForEvent,
  type RunFreightAuditForEventInput,
  type RunFreightAuditForEventOutcome,
} from "./FreightAuditService";
import { openCaseFromAuditOutcome } from "./FreightExceptionService";
import { deriveFreightShadowGateDecision } from "./FreightAuditShadowGating";

type FreightAuditHookLogger = Pick<typeof console, "info" | "warn" | "error">;

export type FreightAuditLifecycleHookInput = RunFreightAuditForEventInput & {
  source: string;
};

export type FreightAuditLifecycleHookDependencies = {
  now: () => Date;
  runAudit: (input: RunFreightAuditForEventInput) => Promise<RunFreightAuditForEventOutcome>;
  openExceptionCase: typeof openCaseFromAuditOutcome;
  isShadowGateEnabled: () => boolean;
  isShadowCaseOpenEnabled: () => boolean;
  logger: FreightAuditHookLogger;
};

function parseBooleanEnv(value: string | undefined) {
  return String(value || "").trim().toLowerCase() === "true";
}

const defaultDependencies: FreightAuditLifecycleHookDependencies = {
  now: () => new Date(),
  runAudit: runFreightAuditForEvent,
  openExceptionCase: openCaseFromAuditOutcome,
  isShadowGateEnabled: () => parseBooleanEnv(process.env.ENABLE_FREIGHT_SHADOW_GATE),
  isShadowCaseOpenEnabled: () => parseBooleanEnv(process.env.ENABLE_FREIGHT_SHADOW_CASE_OPEN),
  logger: console,
};

export async function runFreightAuditLifecycleHook(
  input: FreightAuditLifecycleHookInput,
  dependencyOverrides: Partial<FreightAuditLifecycleHookDependencies> = {}
) {
  const deps: FreightAuditLifecycleHookDependencies = {
    ...defaultDependencies,
    ...dependencyOverrides,
  };

  try {
    const outcome = await deps.runAudit({
      triggerEvent: input.triggerEvent,
      context: input.context,
      orderId: input.orderId,
      shipmentId: input.shipmentId,
      supplierId: input.supplierId,
      freightPartnerId: input.freightPartnerId,
      tenantId: input.tenantId,
      evidence: input.evidence,
      startedAtUtc: input.startedAtUtc,
      createdByRole: input.createdByRole,
      createdById: input.createdById,
      closedByRole: input.closedByRole,
      closedById: input.closedById,
    });

    if (outcome.status === "FAILED") {
      deps.logger.error("freight_audit_hook_failed", {
        source: input.source,
        triggerEvent: input.triggerEvent,
        runId: outcome.runId,
        errorCode: outcome.errorCode,
        errorMessage: outcome.errorMessage,
      });
    } else {
      deps.logger.info("freight_audit_hook_completed", {
        source: input.source,
        triggerEvent: input.triggerEvent,
        runId: outcome.runId,
        ruleSetVersion: outcome.ruleSetVersion,
        persistedResultCount: outcome.persistedResultCount,
        persistedEvidenceCount: outcome.persistedEvidenceCount,
        summary: outcome.summary,
      });

      if (outcome.summary.blockingFailures > 0) {
        deps.logger.warn("freight_audit_hook_blocking_failures", {
          source: input.source,
          triggerEvent: input.triggerEvent,
          runId: outcome.runId,
          blockingFailures: outcome.summary.blockingFailures,
        });
      }
    }

    if (deps.isShadowGateEnabled()) {
      const shadowDecision = deriveFreightShadowGateDecision({
        triggerEvent: input.triggerEvent,
        outcome,
        observedAtUtc: deps.now().toISOString(),
      });
      deps.logger.info("freight_audit_shadow_gate_evaluated", {
        source: input.source,
        ...shadowDecision,
        orderId: input.orderId || null,
        shipmentId: input.shipmentId || null,
        supplierId: input.supplierId || null,
        freightPartnerId: input.freightPartnerId || null,
        tenantId: input.tenantId || null,
      });

      if (shadowDecision.wouldBlock) {
        if (deps.isShadowCaseOpenEnabled()) {
          try {
            const openedCase = await deps.openExceptionCase({
              source: input.source,
              outcome,
              tenantId: input.tenantId || null,
              orderId: input.orderId || null,
              shipmentId: input.shipmentId || null,
              supplierId: input.supplierId || null,
              freightPartnerId: input.freightPartnerId || null,
              openedByRole: input.createdByRole || "system",
              openedById: input.createdById || null,
            });

            if (openedCase.opened === true) {
              deps.logger.warn("freight_audit_shadow_gate_case_opened", {
                source: input.source,
                triggerEvent: input.triggerEvent,
                runId: shadowDecision.runId,
                exceptionId: openedCase.exceptionCase.exceptionId,
                severity: openedCase.exceptionCase.severity,
                status: openedCase.exceptionCase.status,
                reasonCode: shadowDecision.reasonCode,
              });
            } else {
              deps.logger.info("freight_audit_shadow_gate_case_skipped", {
                source: input.source,
                triggerEvent: input.triggerEvent,
                runId: shadowDecision.runId,
                reason: openedCase.reason,
                reasonCode: shadowDecision.reasonCode,
              });
            }
          } catch (error: unknown) {
            deps.logger.error("freight_audit_shadow_gate_case_open_failed", {
              source: input.source,
              triggerEvent: input.triggerEvent,
              runId: shadowDecision.runId,
              reasonCode: shadowDecision.reasonCode,
              error: error instanceof Error ? error.message : String(error || "unknown error"),
            });
          }
        } else {
          deps.logger.info("freight_audit_shadow_gate_case_open_disabled", {
            source: input.source,
            triggerEvent: input.triggerEvent,
            runId: shadowDecision.runId,
            reasonCode: shadowDecision.reasonCode,
          });
        }
      } else {
        deps.logger.info("freight_audit_shadow_gate_allow_only", {
          source: input.source,
          triggerEvent: input.triggerEvent,
          runId: shadowDecision.runId,
          reasonCode: shadowDecision.reasonCode,
        });
      }
    }

    return outcome;
  } catch (error: unknown) {
    deps.logger.error("freight_audit_hook_exception", {
      source: input.source,
      triggerEvent: input.triggerEvent,
      error: error instanceof Error ? error.message : String(error || "unknown error"),
    });
    return null;
  }
}

export function dispatchFreightAuditLifecycleHook(
  input: FreightAuditLifecycleHookInput,
  dependencyOverrides: Partial<FreightAuditLifecycleHookDependencies> = {}
) {
  void runFreightAuditLifecycleHook(input, dependencyOverrides);
}
