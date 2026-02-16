import crypto from "crypto";
import type { FreightAuditEvaluationResult } from "../../lib/freightAudit/FreightAuditEngine";
import {
  runFreightAuditForEvent,
  type RunFreightAuditForEventDependencies,
} from "../../lib/freightAudit/FreightAuditService";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

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

function expectedContextHash(context: Record<string, unknown>) {
  const stable = JSON.stringify(sortKeys(context));
  return crypto.createHash("sha256").update(stable, "utf8").digest("hex");
}

function makeEvaluationResult(): FreightAuditEvaluationResult {
  return {
    triggerEvent: "BOOKED",
    ruleSetVersion: "freight-audit-rules.v1.0.0",
    evaluatedAtUtc: "2026-02-12T12:00:01.000Z",
    evaluations: [
      {
        ruleId: "F-01",
        passed: true,
        severity: "CRITICAL",
        escalationLevel: "BLOCK_ESCROW",
        missingEvidenceCodes: [],
        evaluatedAtUtc: "2026-02-12T12:00:01.000Z",
      },
      {
        ruleId: "F-02",
        passed: false,
        severity: "CRITICAL",
        escalationLevel: "BLOCK_ESCROW",
        missingEvidenceCodes: ["QUOTE_LOCK_RECORD"],
        evaluatedAtUtc: "2026-02-12T12:00:01.000Z",
      },
    ],
    summary: {
      totalRules: 2,
      failedRules: 1,
      criticalFailures: 1,
      blockingFailures: 1,
    },
  };
}

async function testHappyPath() {
  const context = {
    bookingRef: "BOOK-123",
    shipment: {
      incoterm: "DDP",
      items: [{ sku: "ABC", qty: 2 }],
    },
  };

  let createRunInput: any = null;
  let appendResultsInputs: any = null;
  let appendEvidenceInputs: any = null;
  let closeRunInput: any = null;

  const nowValues = [
    new Date("2026-02-12T12:00:00.000Z"),
    new Date("2026-02-12T12:00:02.000Z"),
  ];
  let nowIndex = 0;

  const deps: Partial<RunFreightAuditForEventDependencies> = {
    now: () => nowValues[Math.min(nowIndex++, nowValues.length - 1)],
    randomUUID: () => "01234567-89ab-cdef-0123-456789abcdef",
    createRun: async (input) => {
      createRunInput = input;
      return {
        ...input,
        status: "OPEN",
        closedAt: null,
        summary: null,
        closedByRole: null,
        closedById: null,
        createdAt: "2026-02-12T12:00:00.000Z",
        updatedAt: "2026-02-12T12:00:00.000Z",
      };
    },
    evaluate: () => makeEvaluationResult(),
    appendResults: async (runId, inputs) => {
      appendResultsInputs = { runId, inputs };
      return inputs.map((entry, index) => ({
        ...entry,
        idempotencyKey: `${runId}:result:${index}`,
        createdAt: "2026-02-12T12:00:01.500Z",
      }));
    },
    appendEvidence: async (runId, inputs) => {
      appendEvidenceInputs = { runId, inputs };
      return inputs.map((entry, index) => ({
        ...entry,
        idempotencyKey: `${runId}:evidence:${index}`,
        createdAt: "2026-02-12T12:00:01.600Z",
      }));
    },
    closeRun: async (input) => {
      closeRunInput = input;
      return {
        runId: input.runId,
        ruleSetId: "freight-audit-rules",
        ruleSetVersion: "freight-audit-rules.v1.0.0",
        triggerEvent: "BOOKED",
        status: "CLOSED",
        contextSnapshotHash: createRunInput.contextSnapshotHash,
        orderId: null,
        shipmentId: null,
        supplierId: null,
        freightPartnerId: null,
        tenantId: null,
        startedAt: "2026-02-12T12:00:00.000Z",
        closedAt: input.closedAtUtc || "2026-02-12T12:00:02.000Z",
        createdByRole: "system",
        createdById: null,
        closedByRole: input.closedByRole,
        closedById: input.closedById || null,
        summary: input.summary,
        createdAt: "2026-02-12T12:00:00.000Z",
        updatedAt: "2026-02-12T12:00:02.000Z",
      };
    },
  };

  const outcome = await runFreightAuditForEvent(
    {
      triggerEvent: "BOOKED",
      context,
      evidence: [
        {
          evidenceId: "EVID-1",
          ruleId: "F-01",
          evidenceCode: "PARTNER_LEGAL_ENTITY_RECORD",
          source: "DOCUMENT",
          referenceType: "DOCUMENT_ID",
          referenceId: "DOC-001",
          contentHashSha256: "a".repeat(64),
        },
      ],
    },
    deps
  );

  assert(outcome.status === "COMPLETED", "Expected success outcome");
  if (outcome.status !== "COMPLETED") throw new Error("Expected completed outcome");
  assert(outcome.runId === "freight-audit-20260212120000000-0123456789ab", "Unexpected runId format");
  assert(outcome.contextSnapshotHash === expectedContextHash(context), "Unexpected context hash");
  assert(outcome.persistedResultCount === 2, "Expected two persisted results");
  assert(outcome.persistedEvidenceCount === 1, "Expected one persisted evidence record");

  assert(createRunInput.runId === outcome.runId, "Run creation must use generated runId");
  assert(createRunInput.ruleSetVersion === "freight-audit-rules.v1.0.0", "Unexpected run ruleSetVersion");

  assert(appendResultsInputs.inputs.length === 2, "Expected two append result inputs");
  assert(
    appendResultsInputs.inputs[0].evaluatorKey === "validateFreightPartnerAuthority",
    "Rule F-01 evaluator mapping mismatch"
  );
  assert(
    appendResultsInputs.inputs[1].evaluatorKey === "validateFreightQuoteIntegrity",
    "Rule F-02 evaluator mapping mismatch"
  );

  assert(appendEvidenceInputs.inputs.length === 1, "Expected one evidence append input");
  assert(
    appendEvidenceInputs.inputs[0].capturedAtUtc === "2026-02-12T12:00:01.000Z",
    "Evidence capturedAt default mismatch"
  );

  assert(closeRunInput.summary.failedRules === 1, "Close summary mismatch");
}

async function testFailureDoesNotThrow() {
  let evaluateCalled = false;
  const outcome = await runFreightAuditForEvent(
    {
      triggerEvent: "BOOKED",
      context: {},
    },
    {
      now: () => new Date("2026-02-12T12:00:00.000Z"),
      randomUUID: () => "fedcba98-7654-3210-fedc-ba9876543210",
      createRun: async () => {
        throw new Error("MONGODB_UNAVAILABLE");
      },
      evaluate: () => {
        evaluateCalled = true;
        return makeEvaluationResult();
      },
    }
  );

  assert(outcome.status === "FAILED", "Expected failure outcome");
  if (outcome.status !== "FAILED") throw new Error("Expected failed outcome");
  assert(outcome.runId === null, "RunId must be null when run creation fails");
  assert(outcome.errorCode === "MONGODB_UNAVAILABLE", "Unexpected error code");
  assert(evaluateCalled === false, "Evaluation must not run when run creation fails");
}

async function testFailureAfterEvaluationAttemptsClose() {
  let closeRunCalls = 0;
  const outcome = await runFreightAuditForEvent(
    {
      triggerEvent: "BOOKED",
      context: {},
    },
    {
      now: () => new Date("2026-02-12T12:00:00.000Z"),
      randomUUID: () => "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      createRun: async (input) => ({
        ...input,
        status: "OPEN",
        closedAt: null,
        summary: null,
        closedByRole: null,
        closedById: null,
        createdAt: "2026-02-12T12:00:00.000Z",
        updatedAt: "2026-02-12T12:00:00.000Z",
      }),
      evaluate: () => makeEvaluationResult(),
      appendResults: async () => {
        throw new Error("RESULT_WRITE_FAILED");
      },
      closeRun: async (input) => {
        closeRunCalls += 1;
        return {
          runId: input.runId,
          ruleSetId: "freight-audit-rules",
          ruleSetVersion: "freight-audit-rules.v1.0.0",
          triggerEvent: "BOOKED",
          status: "CLOSED",
          contextSnapshotHash: "a".repeat(64),
          orderId: null,
          shipmentId: null,
          supplierId: null,
          freightPartnerId: null,
          tenantId: null,
          startedAt: "2026-02-12T12:00:00.000Z",
          closedAt: "2026-02-12T12:00:01.000Z",
          createdByRole: "system",
          createdById: null,
          closedByRole: input.closedByRole,
          closedById: input.closedById || null,
          summary: input.summary,
          createdAt: "2026-02-12T12:00:00.000Z",
          updatedAt: "2026-02-12T12:00:01.000Z",
        };
      },
    }
  );

  assert(outcome.status === "FAILED", "Expected failure outcome");
  if (outcome.status !== "FAILED") throw new Error("Expected failed outcome");
  assert(outcome.runId !== null, "RunId should be returned when run was created");
  assert(outcome.errorCode === "RESULT_WRITE_FAILED", "Expected propagated error code");
  assert(closeRunCalls === 1, "Service must attempt close on post-evaluation failure");
}

async function run() {
  await testHappyPath();
  await testFailureDoesNotThrow();
  await testFailureAfterEvaluationAttemptsClose();
}

run();
