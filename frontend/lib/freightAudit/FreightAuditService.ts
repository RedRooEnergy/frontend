import crypto from "crypto";
import {
  evaluateFreightEvent,
  type FreightAuditEvaluationContext,
  type FreightAuditEvaluationResult,
  type FreightAuditEvaluationSummary,
} from "./FreightAuditEngine";
import {
  appendFreightAuditEvidence,
  appendFreightAuditResults,
  closeFreightAuditRun,
  createFreightAuditRun,
  type AppendFreightAuditEvidenceInput,
  type AppendFreightAuditResultInput,
  type CloseFreightAuditRunInput,
  type CreateFreightAuditRunInput,
  type FreightAuditActorRole,
  type FreightAuditEvidence,
  type FreightAuditResult,
  type FreightAuditRun,
} from "./FreightAuditStore";
import {
  FREIGHT_AUDIT_RULE_SET,
  FREIGHT_AUDIT_RULE_SET_VERSION,
  getFreightAuditRule,
  type FreightAuditTriggerEvent,
} from "./FreightAuditRules";

export type RunFreightAuditEvidenceInput = Omit<
  AppendFreightAuditEvidenceInput,
  "runId" | "ruleSetVersion" | "capturedAtUtc" | "capturedByRole" | "capturedById"
> & {
  capturedAtUtc?: string;
  capturedByRole?: FreightAuditActorRole;
  capturedById?: string | null;
};

export type RunFreightAuditForEventInput = {
  triggerEvent: FreightAuditTriggerEvent;
  context: FreightAuditEvaluationContext;
  orderId?: string | null;
  shipmentId?: string | null;
  supplierId?: string | null;
  freightPartnerId?: string | null;
  tenantId?: string | null;
  evidence?: RunFreightAuditEvidenceInput[];
  startedAtUtc?: string;
  createdByRole?: FreightAuditActorRole;
  createdById?: string | null;
  closedByRole?: FreightAuditActorRole;
  closedById?: string | null;
};

export type RunFreightAuditForEventSuccess = {
  status: "COMPLETED";
  runId: string;
  triggerEvent: FreightAuditTriggerEvent;
  ruleSetVersion: string;
  contextSnapshotHash: string;
  startedAtUtc: string;
  closedAtUtc: string;
  summary: FreightAuditEvaluationSummary;
  persistedResultCount: number;
  persistedEvidenceCount: number;
};

export type RunFreightAuditForEventFailure = {
  status: "FAILED";
  runId: string | null;
  triggerEvent: FreightAuditTriggerEvent;
  ruleSetVersion: string;
  contextSnapshotHash: string;
  errorCode: string;
  errorMessage: string;
};

export type RunFreightAuditForEventOutcome = RunFreightAuditForEventSuccess | RunFreightAuditForEventFailure;

export type RunFreightAuditForEventDependencies = {
  now: () => Date;
  randomUUID: () => string;
  createRun: (input: CreateFreightAuditRunInput) => Promise<FreightAuditRun>;
  evaluate: (params: { triggerEvent: FreightAuditTriggerEvent; context: FreightAuditEvaluationContext }) => FreightAuditEvaluationResult;
  appendResults: (runId: string, inputs: AppendFreightAuditResultInput[]) => Promise<FreightAuditResult[]>;
  appendEvidence: (runId: string, inputs: AppendFreightAuditEvidenceInput[]) => Promise<FreightAuditEvidence[]>;
  closeRun: (input: CloseFreightAuditRunInput) => Promise<FreightAuditRun>;
};

const defaultDependencies: RunFreightAuditForEventDependencies = {
  now: () => new Date(),
  randomUUID: () => crypto.randomUUID(),
  createRun: createFreightAuditRun,
  evaluate: evaluateFreightEvent,
  appendResults: appendFreightAuditResults,
  appendEvidence: appendFreightAuditEvidence,
  closeRun: closeFreightAuditRun,
};

function sortKeys(input: any): any {
  if (Array.isArray(input)) return input.map(sortKeys);
  if (input && typeof input === "object") {
    return Object.keys(input)
      .sort()
      .reduce((acc: Record<string, unknown>, key) => {
        acc[key] = sortKeys((input as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return input;
}

function stableStringify(input: unknown) {
  return JSON.stringify(sortKeys(input));
}

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

function compactIso(isoUtc: string) {
  return isoUtc.replace(/[-:.TZ]/g, "");
}

function makeRunId(now: Date, randomUUID: () => string) {
  const randomSegment = randomUUID().replace(/-/g, "").slice(0, 12);
  return `freight-audit-${compactIso(now.toISOString())}-${randomSegment}`;
}

function resolveErrorCode(error: unknown) {
  const raw = error instanceof Error ? error.message : "FREIGHT_AUDIT_ORCHESTRATION_FAILED";
  const code = raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return code || "FREIGHT_AUDIT_ORCHESTRATION_FAILED";
}

function toResultAppendInputs(runId: string, evaluationResult: FreightAuditEvaluationResult): AppendFreightAuditResultInput[] {
  return evaluationResult.evaluations.map((entry) => {
    const rule = getFreightAuditRule(entry.ruleId);
    return {
      runId,
      ruleId: entry.ruleId,
      ruleSetVersion: evaluationResult.ruleSetVersion,
      triggerEvent: evaluationResult.triggerEvent,
      passed: entry.passed,
      severity: entry.severity,
      escalationLevel: entry.escalationLevel,
      missingEvidenceCodes: entry.missingEvidenceCodes,
      evaluatedAtUtc: entry.evaluatedAtUtc,
      evaluatorKey: rule?.condition.evaluatorKey || "UNKNOWN_EVALUATOR",
      detailsCode: entry.passed ? null : "RULE_FAILED",
    };
  });
}

function toEvidenceAppendInputs(params: {
  runId: string;
  ruleSetVersion: string;
  evidence: RunFreightAuditEvidenceInput[];
  defaultCapturedAtUtc: string;
  defaultCapturedByRole: FreightAuditActorRole;
  defaultCapturedById: string | null;
}): AppendFreightAuditEvidenceInput[] {
  return params.evidence.map((entry) => ({
    ...entry,
    runId: params.runId,
    ruleSetVersion: params.ruleSetVersion,
    capturedAtUtc: entry.capturedAtUtc || params.defaultCapturedAtUtc,
    capturedByRole: entry.capturedByRole || params.defaultCapturedByRole,
    capturedById: entry.capturedById ?? params.defaultCapturedById,
  }));
}

export async function runFreightAuditForEvent(
  input: RunFreightAuditForEventInput,
  dependencyOverrides: Partial<RunFreightAuditForEventDependencies> = {}
): Promise<RunFreightAuditForEventOutcome> {
  const deps: RunFreightAuditForEventDependencies = {
    ...defaultDependencies,
    ...dependencyOverrides,
  };

  const now = deps.now();
  const runId = makeRunId(now, deps.randomUUID);
  const startedAtUtc = input.startedAtUtc || now.toISOString();
  const createdByRole = input.createdByRole || "system";
  const createdById = input.createdById || null;
  const closedByRole = input.closedByRole || createdByRole;
  const closedById = input.closedById ?? createdById;
  const contextSnapshotHash = sha256Hex(stableStringify(input.context || {}));

  let runCreated = false;
  let evaluationResult: FreightAuditEvaluationResult | null = null;

  try {
    await deps.createRun({
      runId,
      ruleSetId: FREIGHT_AUDIT_RULE_SET.ruleSetId,
      ruleSetVersion: FREIGHT_AUDIT_RULE_SET_VERSION,
      triggerEvent: input.triggerEvent,
      contextSnapshotHash,
      orderId: input.orderId || null,
      shipmentId: input.shipmentId || null,
      supplierId: input.supplierId || null,
      freightPartnerId: input.freightPartnerId || null,
      tenantId: input.tenantId || null,
      startedAt: startedAtUtc,
      createdByRole,
      createdById,
    });
    runCreated = true;

    evaluationResult = deps.evaluate({
      triggerEvent: input.triggerEvent,
      context: input.context || {},
    });

    const resultInputs = toResultAppendInputs(runId, evaluationResult);
    const persistedResults = await deps.appendResults(runId, resultInputs);

    const evidenceInputs = toEvidenceAppendInputs({
      runId,
      ruleSetVersion: evaluationResult.ruleSetVersion,
      evidence: input.evidence || [],
      defaultCapturedAtUtc: evaluationResult.evaluatedAtUtc,
      defaultCapturedByRole: createdByRole,
      defaultCapturedById: createdById,
    });

    const persistedEvidence = evidenceInputs.length > 0 ? await deps.appendEvidence(runId, evidenceInputs) : [];
    const closedAtUtc = deps.now().toISOString();

    await deps.closeRun({
      runId,
      summary: evaluationResult.summary,
      closedByRole,
      closedById,
      closedAtUtc,
    });

    return {
      status: "COMPLETED",
      runId,
      triggerEvent: input.triggerEvent,
      ruleSetVersion: evaluationResult.ruleSetVersion,
      contextSnapshotHash,
      startedAtUtc,
      closedAtUtc,
      summary: evaluationResult.summary,
      persistedResultCount: persistedResults.length,
      persistedEvidenceCount: persistedEvidence.length,
    };
  } catch (error: unknown) {
    if (runCreated && evaluationResult) {
      try {
        await deps.closeRun({
          runId,
          summary: evaluationResult.summary,
          closedByRole,
          closedById,
          closedAtUtc: deps.now().toISOString(),
        });
      } catch {
        // No-op: service remains non-enforcing and non-throwing in Phase 4.
      }
    }

    const fallbackMessage = "Freight audit orchestration failed";
    return {
      status: "FAILED",
      runId: runCreated ? runId : null,
      triggerEvent: input.triggerEvent,
      ruleSetVersion: evaluationResult?.ruleSetVersion || FREIGHT_AUDIT_RULE_SET_VERSION,
      contextSnapshotHash,
      errorCode: resolveErrorCode(error),
      errorMessage: error instanceof Error ? error.message : fallbackMessage,
    };
  }
}
