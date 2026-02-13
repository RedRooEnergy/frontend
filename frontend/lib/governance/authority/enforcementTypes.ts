import type { AuthorityActorRole } from "./types";

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
