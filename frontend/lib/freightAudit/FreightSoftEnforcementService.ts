import crypto from "crypto";
import {
  runFreightAuditForEvent,
  type RunFreightAuditForEventOutcome,
  type RunFreightAuditForEventInput,
  type RunFreightAuditForEventSuccess,
} from "./FreightAuditService";
import { type FreightAuditEvaluationContext } from "./FreightAuditEngine";
import {
  createFreightSettlementHold,
  getFreightSettlementHold,
  getLatestFreightSettlementHold,
  listFreightSettlementHolds,
  overrideFreightSettlementHold,
  type CreateFreightSettlementHoldResult,
  type FreightSettlementHold,
} from "./FreightSettlementHoldStore";
import { FREIGHT_SHADOW_GATE_POLICY_VERSION } from "./FreightAuditShadowGating";
import { getFreightAuditRun, type FreightAuditActorRole, type FreightAuditRun } from "./FreightAuditStore";
import { openCaseFromAuditOutcome, recordAdminDecision } from "./FreightExceptionService";

type FreightSoftEnforcementLogger = Pick<typeof console, "info" | "warn" | "error">;

export const FREIGHT_SOFT_ENFORCEMENT_PILOT_TRIGGER = "PAYOUT_READY" as const;

type FreightSoftEnforcementProceedReason =
  | "PILOT_DISABLED"
  | "TENANT_NOT_IN_PILOT"
  | "TRIGGER_NOT_IN_SCOPE"
  | "NO_BLOCKING_FAILURES"
  | "AUDIT_FAILED"
  | "HOLD_ALREADY_CLEARED";

export type EvaluatePayoutSoftEnforcementInput = {
  source: string;
  tenantId?: string | null;
  orderId: string;
  shipmentId?: string | null;
  supplierId?: string | null;
  freightPartnerId?: string | null;
  actorId: string;
  actorRole?: FreightAuditActorRole;
  context: FreightAuditEvaluationContext;
};

export type EvaluatePayoutSoftEnforcementOutcome =
  | {
      status: "REVIEW_REQUIRED";
      hold: FreightSettlementHold;
      holdWasCreated: boolean;
      auditOutcome: RunFreightAuditForEventSuccess;
    }
  | {
      status: "PROCEED";
      reason: FreightSoftEnforcementProceedReason;
      hold?: FreightSettlementHold | null;
      auditOutcome?: RunFreightAuditForEventOutcome | null;
    };

export type ExecutePayoutWithSoftEnforcementInput<T> = EvaluatePayoutSoftEnforcementInput & {
  executePayout: () => Promise<T>;
};

export type ExecutePayoutWithSoftEnforcementOutcome<T> =
  | {
      status: "REVIEW_REQUIRED";
      hold: FreightSettlementHold;
      holdWasCreated: boolean;
      auditOutcome: RunFreightAuditForEventSuccess;
    }
  | {
      status: "PROCEEDED";
      reason: FreightSoftEnforcementProceedReason;
      hold?: FreightSettlementHold | null;
      auditOutcome?: RunFreightAuditForEventOutcome | null;
      result: T;
    };

export type OverridePayoutSettlementHoldInput = {
  holdId: string;
  approvalId: string;
  rationale: string;
  evidenceManifestHash: string;
  actorId: string;
  actorRole?: "admin" | "regulator";
};

export type FreightSoftEnforcementDependencies = {
  now: () => Date;
  randomUUID: () => string;
  runAudit: (input: RunFreightAuditForEventInput) => Promise<RunFreightAuditForEventOutcome>;
  getAuditRun: (runId: string) => Promise<FreightAuditRun | null>;
  openCaseFromAuditOutcome: typeof openCaseFromAuditOutcome;
  createHold: (input: Parameters<typeof createFreightSettlementHold>[0]) => Promise<CreateFreightSettlementHoldResult>;
  getLatestHold: (params: { tenantId: string; orderId: string; triggerEvent?: "PAYOUT_READY" }) => Promise<FreightSettlementHold | null>;
  getHold: (holdId: string) => Promise<FreightSettlementHold | null>;
  listHolds: typeof listFreightSettlementHolds;
  overrideHold: (input: Parameters<typeof overrideFreightSettlementHold>[0]) => Promise<FreightSettlementHold>;
  recordAdminDecision: typeof recordAdminDecision;
  isPilotEnabled: () => boolean;
  getPilotTenants: () => Set<string>;
  getPilotTrigger: () => string;
  logger: FreightSoftEnforcementLogger;
};

function parseBooleanEnv(value: string | undefined) {
  return String(value || "").trim().toLowerCase() === "true";
}

function parseListEnv(value: string | undefined) {
  return new Set(
    String(value || "")
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
  );
}

const defaultDependencies: FreightSoftEnforcementDependencies = {
  now: () => new Date(),
  randomUUID: () => crypto.randomUUID(),
  runAudit: runFreightAuditForEvent,
  getAuditRun: getFreightAuditRun,
  openCaseFromAuditOutcome,
  createHold: createFreightSettlementHold,
  getLatestHold: getLatestFreightSettlementHold,
  getHold: getFreightSettlementHold,
  listHolds: listFreightSettlementHolds,
  overrideHold: overrideFreightSettlementHold,
  recordAdminDecision,
  isPilotEnabled: () => parseBooleanEnv(process.env.ENABLE_FREIGHT_SOFT_ENFORCEMENT_PILOT),
  getPilotTenants: () => parseListEnv(process.env.FREIGHT_SOFT_ENFORCEMENT_PILOT_TENANTS),
  getPilotTrigger: () => String(process.env.FREIGHT_SOFT_ENFORCEMENT_TRIGGER || FREIGHT_SOFT_ENFORCEMENT_PILOT_TRIGGER).trim(),
  logger: console,
};

function resolveDependencies(
  overrides: Partial<FreightSoftEnforcementDependencies> = {}
): FreightSoftEnforcementDependencies {
  return {
    ...defaultDependencies,
    ...overrides,
  };
}

function compactIso(isoUtc: string) {
  return isoUtc.replace(/[-:.TZ]/g, "");
}

function stableJoin(parts: Array<string | null | undefined>) {
  return parts.map((part) => String(part || "").trim()).join(":");
}

function makeHoldId(nowUtc: string, randomUUID: () => string) {
  return `freight-hold-${compactIso(nowUtc)}-${randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

function isPilotTenant(tenantId: string, pilotTenants: Set<string>) {
  return pilotTenants.has(tenantId);
}

function toSyntheticOutcome(run: FreightAuditRun): RunFreightAuditForEventSuccess | null {
  if (run.triggerEvent !== FREIGHT_SOFT_ENFORCEMENT_PILOT_TRIGGER) return null;
  if (!run.summary) return null;

  return {
    status: "COMPLETED",
    runId: run.runId,
    triggerEvent: run.triggerEvent,
    ruleSetVersion: run.ruleSetVersion,
    contextSnapshotHash: run.contextSnapshotHash,
    startedAtUtc: run.startedAt,
    closedAtUtc: run.closedAt || run.updatedAt,
    summary: run.summary,
    persistedResultCount: run.summary.totalRules,
    persistedEvidenceCount: 0,
  };
}

export async function evaluatePayoutSoftEnforcement(
  input: EvaluatePayoutSoftEnforcementInput,
  dependencyOverrides: Partial<FreightSoftEnforcementDependencies> = {}
): Promise<EvaluatePayoutSoftEnforcementOutcome> {
  const deps = resolveDependencies(dependencyOverrides);
  const tenantId = String(input.tenantId || "").trim();

  if (!deps.isPilotEnabled()) {
    deps.logger.info("freight_soft_enforcement_skipped_not_in_pilot", {
      source: input.source,
      orderId: input.orderId,
      tenantId: tenantId || null,
      reason: "pilot_disabled",
    });
    return {
      status: "PROCEED",
      reason: "PILOT_DISABLED",
      hold: null,
      auditOutcome: null,
    };
  }

  if (deps.getPilotTrigger() !== FREIGHT_SOFT_ENFORCEMENT_PILOT_TRIGGER) {
    deps.logger.info("freight_soft_enforcement_skipped_not_in_pilot", {
      source: input.source,
      orderId: input.orderId,
      tenantId: tenantId || null,
      reason: "trigger_not_in_scope",
      configuredTrigger: deps.getPilotTrigger(),
    });
    return {
      status: "PROCEED",
      reason: "TRIGGER_NOT_IN_SCOPE",
      hold: null,
      auditOutcome: null,
    };
  }

  if (!tenantId || !isPilotTenant(tenantId, deps.getPilotTenants())) {
    deps.logger.info("freight_soft_enforcement_skipped_not_in_pilot", {
      source: input.source,
      orderId: input.orderId,
      tenantId: tenantId || null,
      reason: "tenant_not_allowlisted",
    });
    return {
      status: "PROCEED",
      reason: "TENANT_NOT_IN_PILOT",
      hold: null,
      auditOutcome: null,
    };
  }

  const existingHold = await deps.getLatestHold({
    tenantId,
    orderId: input.orderId,
    triggerEvent: FREIGHT_SOFT_ENFORCEMENT_PILOT_TRIGGER,
  });

  if (existingHold?.status === "REVIEW_REQUIRED") {
    deps.logger.warn("freight_soft_enforcement_hold_exists", {
      source: input.source,
      orderId: input.orderId,
      tenantId,
      holdId: existingHold.holdId,
      status: existingHold.status,
    });
    return {
      status: "REVIEW_REQUIRED",
      hold: existingHold,
      holdWasCreated: false,
      auditOutcome: {
        status: "COMPLETED",
        runId: existingHold.runId,
        triggerEvent: FREIGHT_SOFT_ENFORCEMENT_PILOT_TRIGGER,
        ruleSetVersion: existingHold.ruleSetVersion,
        contextSnapshotHash: "",
        startedAtUtc: existingHold.createdAtUtc,
        closedAtUtc: existingHold.createdAtUtc,
        summary: {
          totalRules: 0,
          failedRules: existingHold.blockingFailures,
          criticalFailures: existingHold.criticalFailures,
          blockingFailures: existingHold.blockingFailures,
        },
        persistedResultCount: 0,
        persistedEvidenceCount: 0,
      },
    };
  }

  if (existingHold && (existingHold.status === "OVERRIDDEN" || existingHold.status === "RELEASED")) {
    return {
      status: "PROCEED",
      reason: "HOLD_ALREADY_CLEARED",
      hold: existingHold,
      auditOutcome: null,
    };
  }

  const auditOutcome = await deps.runAudit({
    triggerEvent: FREIGHT_SOFT_ENFORCEMENT_PILOT_TRIGGER,
    context: input.context,
    orderId: input.orderId,
    shipmentId: input.shipmentId || null,
    supplierId: input.supplierId || null,
    freightPartnerId: input.freightPartnerId || null,
    tenantId,
    createdByRole: input.actorRole || "admin",
    createdById: input.actorId,
    closedByRole: input.actorRole || "admin",
    closedById: input.actorId,
  });

  if (auditOutcome.status === "FAILED") {
    deps.logger.warn("freight_soft_enforcement_skipped_audit_failed", {
      source: input.source,
      orderId: input.orderId,
      tenantId,
      runId: auditOutcome.runId,
      errorCode: auditOutcome.errorCode,
    });
    return {
      status: "PROCEED",
      reason: "AUDIT_FAILED",
      hold: null,
      auditOutcome,
    };
  }

  const gateRequired = auditOutcome.summary.blockingFailures > 0 && auditOutcome.summary.criticalFailures > 0;
  if (!gateRequired) {
    deps.logger.info("freight_soft_enforcement_skipped_no_blocking_failures", {
      source: input.source,
      orderId: input.orderId,
      tenantId,
      runId: auditOutcome.runId,
      blockingFailures: auditOutcome.summary.blockingFailures,
      criticalFailures: auditOutcome.summary.criticalFailures,
    });
    return {
      status: "PROCEED",
      reason: "NO_BLOCKING_FAILURES",
      hold: null,
      auditOutcome,
    };
  }

  let linkedExceptionId: string | null = null;
  try {
    const opened = await deps.openCaseFromAuditOutcome({
      source: input.source,
      outcome: auditOutcome,
      tenantId,
      orderId: input.orderId,
      shipmentId: input.shipmentId || null,
      supplierId: input.supplierId || null,
      freightPartnerId: input.freightPartnerId || null,
      openedByRole: input.actorRole || "admin",
      openedById: input.actorId,
    });
    if (opened.opened) linkedExceptionId = opened.exceptionCase.exceptionId;
  } catch (error: unknown) {
    deps.logger.error("freight_soft_enforcement_case_link_failed", {
      source: input.source,
      orderId: input.orderId,
      tenantId,
      runId: auditOutcome.runId,
      error: error instanceof Error ? error.message : String(error || "unknown error"),
    });
  }

  const nowUtc = deps.now().toISOString();
  const createResult = await deps.createHold({
    holdId: makeHoldId(nowUtc, deps.randomUUID),
    tenantId,
    orderId: input.orderId,
    shipmentId: input.shipmentId || null,
    triggerEvent: FREIGHT_SOFT_ENFORCEMENT_PILOT_TRIGGER,
    runId: auditOutcome.runId,
    ruleSetVersion: auditOutcome.ruleSetVersion,
    shadowPolicyVersion: FREIGHT_SHADOW_GATE_POLICY_VERSION,
    reasonCode: "BLOCKING_FAILURES_PRESENT",
    blockingFailures: auditOutcome.summary.blockingFailures,
    criticalFailures: auditOutcome.summary.criticalFailures,
    status: "REVIEW_REQUIRED",
    createdAtUtc: nowUtc,
    createdByRole: "system",
    createdById: input.actorId,
    linkedExceptionId,
    overrideApprovalId: null,
    overrideEvidenceManifestHash: null,
    overrideRationale: null,
    overrideRecordedAtUtc: null,
    idempotencyKey: stableJoin([tenantId, input.orderId, FREIGHT_SOFT_ENFORCEMENT_PILOT_TRIGGER, auditOutcome.runId]),
  });

  if (createResult.created) {
    deps.logger.warn("freight_soft_enforcement_hold_created", {
      source: input.source,
      orderId: input.orderId,
      tenantId,
      holdId: createResult.hold.holdId,
      runId: createResult.hold.runId,
      blockingFailures: createResult.hold.blockingFailures,
      criticalFailures: createResult.hold.criticalFailures,
    });
  } else {
    deps.logger.warn("freight_soft_enforcement_hold_exists", {
      source: input.source,
      orderId: input.orderId,
      tenantId,
      holdId: createResult.hold.holdId,
      status: createResult.hold.status,
    });
  }

  return {
    status: "REVIEW_REQUIRED",
    hold: createResult.hold,
    holdWasCreated: createResult.created,
    auditOutcome,
  };
}

export async function executePayoutWithSoftEnforcement<T>(
  input: ExecutePayoutWithSoftEnforcementInput<T>,
  dependencyOverrides: Partial<FreightSoftEnforcementDependencies> = {}
): Promise<ExecutePayoutWithSoftEnforcementOutcome<T>> {
  const deps = resolveDependencies(dependencyOverrides);
  const decision = await evaluatePayoutSoftEnforcement(input, deps);
  if (decision.status === "REVIEW_REQUIRED") {
    return decision;
  }

  const result = await input.executePayout();
  if (decision.reason === "HOLD_ALREADY_CLEARED" && decision.hold?.status === "OVERRIDDEN") {
    deps.logger.info("freight_soft_enforcement_payout_proceeded_after_override", {
      source: input.source,
      orderId: input.orderId,
      tenantId: input.tenantId || null,
      holdId: decision.hold.holdId,
      status: decision.hold.status,
    });
  }

  return {
    status: "PROCEEDED",
    reason: decision.reason,
    hold: decision.hold,
    auditOutcome: decision.auditOutcome,
    result,
  };
}

export async function listPayoutSettlementHolds(
  filters: Parameters<typeof listFreightSettlementHolds>[0] = {},
  dependencyOverrides: Partial<FreightSoftEnforcementDependencies> = {}
) {
  const deps = resolveDependencies(dependencyOverrides);
  return deps.listHolds(filters);
}

export async function getPayoutSettlementHold(
  holdId: string,
  dependencyOverrides: Partial<FreightSoftEnforcementDependencies> = {}
) {
  const deps = resolveDependencies(dependencyOverrides);
  return deps.getHold(holdId);
}

export async function overridePayoutSettlementHold(
  input: OverridePayoutSettlementHoldInput,
  dependencyOverrides: Partial<FreightSoftEnforcementDependencies> = {}
) {
  const deps = resolveDependencies(dependencyOverrides);
  const existing = await deps.getHold(input.holdId);
  if (!existing) throw new Error("FREIGHT_SETTLEMENT_HOLD_NOT_FOUND");
  if (existing.status === "OVERRIDDEN") return existing;
  if (existing.status !== "REVIEW_REQUIRED") throw new Error("FREIGHT_SETTLEMENT_HOLD_NOT_REVIEW_REQUIRED");

  let exceptionId = existing.linkedExceptionId || null;
  if (!exceptionId) {
    const run = await deps.getAuditRun(existing.runId);
    const synthetic = run ? toSyntheticOutcome(run) : null;
    if (synthetic) {
      const opened = await deps.openCaseFromAuditOutcome({
        source: "api.admin.freight-settlement-holds.override",
        outcome: synthetic,
        tenantId: existing.tenantId,
        orderId: existing.orderId,
        shipmentId: existing.shipmentId || null,
        openedByRole: input.actorRole || "admin",
        openedById: input.actorId,
      });
      if (opened.opened) exceptionId = opened.exceptionCase.exceptionId;
    }
  }
  if (!exceptionId) throw new Error("FREIGHT_SOFT_ENFORCEMENT_EXCEPTION_LINK_REQUIRED");

  await deps.recordAdminDecision(
    {
      exceptionId,
      decisionType: "ALLOW_PAYOUT",
      approvalId: input.approvalId,
      rationale: input.rationale,
      evidenceManifestHash: input.evidenceManifestHash,
      actorId: input.actorId,
      actorRole: input.actorRole || "admin",
      idempotencyKey: stableJoin([
        input.holdId,
        "ALLOW_PAYOUT",
        input.approvalId,
        input.evidenceManifestHash,
      ]),
    },
    deps
  );

  const overridden = await deps.overrideHold({
    holdId: input.holdId,
    approvalId: input.approvalId,
    rationale: input.rationale,
    evidenceManifestHash: input.evidenceManifestHash,
    linkedExceptionId: exceptionId,
    recordedAtUtc: deps.now().toISOString(),
  });

  deps.logger.info("freight_soft_enforcement_override_recorded", {
    holdId: overridden.holdId,
    orderId: overridden.orderId,
    tenantId: overridden.tenantId,
    approvalId: overridden.overrideApprovalId,
    exceptionId: overridden.linkedExceptionId,
  });

  return overridden;
}
