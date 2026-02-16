import { evaluateFreightEvent } from "../../lib/freightAudit/FreightAuditEngine";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function run() {
  const result = evaluateFreightEvent({
    triggerEvent: "BOOKED",
    context: {},
  });

  assert(result.ruleSetVersion === "freight-audit-rules.v1.0.0", "Unexpected ruleSetVersion");
  assert(result.triggerEvent === "BOOKED", "Unexpected trigger event");
  assert(result.evaluations.length === 2, "BOOKED must evaluate exactly 2 rules");

  const ids = result.evaluations.map((entry) => entry.ruleId).sort((a, b) => a.localeCompare(b));
  assert(ids[0] === "F-01" && ids[1] === "F-02", "BOOKED must map to F-01 and F-02");

  assert(result.summary.totalRules === 2, "totalRules mismatch");
  assert(result.summary.failedRules === 0, "failedRules mismatch");
  assert(result.summary.criticalFailures === 0, "criticalFailures mismatch");
  assert(result.summary.blockingFailures === 0, "blockingFailures mismatch");

  for (const evaluation of result.evaluations) {
    assert(evaluation.passed === true, `${evaluation.ruleId} should pass with stub evaluator`);
    assert(Array.isArray(evaluation.missingEvidenceCodes), "missingEvidenceCodes must be an array");
    assert(!!evaluation.evaluatedAtUtc, "evaluatedAtUtc must be present");
  }
}

run();
