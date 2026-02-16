import { emitFeeLedgerEvent } from "../feeLedgerStore";
import { evaluateAuthorityEnforcementDecision } from "../governance/authority/enforcementService";

type FeeLedgerEmitter = typeof emitFeeLedgerEvent;
type AuthorityEnforcementEvaluator = typeof evaluateAuthorityEnforcementDecision;

let feeLedgerEmitter: FeeLedgerEmitter = emitFeeLedgerEvent;
let authorityEnforcementEvaluator: AuthorityEnforcementEvaluator = evaluateAuthorityEnforcementDecision;

export function getFeeLedgerEmitter(): FeeLedgerEmitter {
  return feeLedgerEmitter;
}

export function getAuthorityEnforcementEvaluator(): AuthorityEnforcementEvaluator {
  return authorityEnforcementEvaluator;
}

export function setFeeLedgerEmitterForTests(emitter?: FeeLedgerEmitter) {
  feeLedgerEmitter = emitter || emitFeeLedgerEvent;
}

export function setAuthorityEnforcementEvaluatorForTests(evaluator?: AuthorityEnforcementEvaluator) {
  authorityEnforcementEvaluator = evaluator || evaluateAuthorityEnforcementDecision;
}
