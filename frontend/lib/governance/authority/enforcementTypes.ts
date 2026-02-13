import type { AuthorityActorRole } from "./types";
import type { AuthorityEnforcementGuardSignalStatus } from "./enforcementGuard";

export const AUTHORITY_ENFORCEMENT_VERSION = "gov04-enforcement.v1" as const;

export type AuthorityEnforcementResult = "ALLOW" | "BLOCK";

export type AuthorityEnforcementDecisionRecord = {
  _id?: string;
  enforcementDecisionId: string;
  idempotencyKey: string;
  tenantId?: string | null;
  policyId: string;
  policyVersionHash: string | null;
  subjectActorId: string;
  requestActorId: string;
  requestActorRole: AuthorityActorRole;
  approverActorId?: string | null;
  approverActorRole?: AuthorityActorRole | null;
  delegationId?: string | null;
  resource: string;
  action: string;
  shadowDecisionId: string;
  shadowDecisionHashSha256: string;
  decisionHashSha256: string;
  enforcementMode: true;
  enforcementVersion: typeof AUTHORITY_ENFORCEMENT_VERSION;
  enforcementResult: AuthorityEnforcementResult;
  shadowVsEnforcementDivergence: boolean;
  responseMutationCode?: string | null;
  deterministicHashSha256: string;
  canonicalEnforcementJson: string;
  decidedAtUtc: string;
  metadata?: Record<string, unknown>;
  createdAtUtc: string;
};

export type AuthorityEnforcementPreconditionState = {
  enabled: boolean;
  killSwitch: boolean;
  strictMode: boolean;
  bypassed: boolean;
  bypassReason:
    | "KILL_SWITCH_ENABLED"
    | "ENFORCEMENT_FLAG_DISABLED"
    | "TENANT_NOT_ALLOWLISTED"
    | "ROLE_NOT_ALLOWLISTED"
    | "RESOURCE_ACTION_NOT_ALLOWLISTED"
    | "POLICY_VERSION_NOT_ALLOWLISTED"
    | "POLICY_VERSION_NOT_PROVIDED"
    | null;
};

export type AuthorityEnforcementGuardReportRecord = {
  _id?: string;
  guardReportId: string;
  idempotencyKey: string;
  reportVersion: string;
  source: "api_internal" | "cli_local" | "cli_http";
  windowStartUtc: string;
  windowEndUtc: string;
  reportHashSha256: string;
  overallStatus: AuthorityEnforcementGuardSignalStatus;
  rollbackRecommended: boolean;
  killSwitchAction: "NONE" | "SET_GOV04_AUTH_ENFORCEMENT_KILL_SWITCH_TRUE";
  signals: Array<{
    signalCode:
      | "CONFLICT_RATE"
      | "CASE_OPEN_RATE"
      | "DETERMINISTIC_MISMATCH"
      | "POLICY_VERSION_UNRESOLVED_RATE"
      | "SHADOW_VS_ENFORCEMENT_DIVERGENCE_RATE";
    value: number;
    warnThreshold: number;
    pageThreshold: number;
    status: AuthorityEnforcementGuardSignalStatus;
  }>;
  deterministicHashSha256: string;
  canonicalGuardJson: string;
  evaluatedAtUtc: string;
  metadata?: Record<string, unknown>;
  createdAtUtc: string;
};

export type AuthorityEnforcementControlEventType = "KILL_SWITCH_ACTIVATED" | "KILL_SWITCH_DEACTIVATED";

export type AuthorityEnforcementControlEventRecord = {
  _id?: string;
  controlEventId: string;
  idempotencyKey: string;
  eventType: AuthorityEnforcementControlEventType;
  killSwitchState: boolean;
  reasonCode: string;
  guardReportId?: string | null;
  reportHashSha256?: string | null;
  triggeredBy: string;
  eventAtUtc: string;
  deterministicHashSha256: string;
  canonicalControlJson: string;
  metadata?: Record<string, unknown>;
  createdAtUtc: string;
};
