import { canonicalPayloadHash, sha256Hex } from "./hash";
import {
  listAuthorityPolicyLifecycleEventsByWindow,
  listAuthorityPolicyVersionsByWindow,
  type AuthorityPolicyStoreDependencies,
} from "./policyStore";
import {
  listAuthorityDelegationEventsByWindow,
  type AuthorityDelegationStoreDependencies,
} from "./delegationStore";
import {
  listAuthorityApprovalDecisionsByWindow,
  type AuthorityDecisionStoreDependencies,
} from "./decisionStore";
import type {
  AuthorityApprovalDecisionRecord,
  AuthorityDelegationEventRecord,
  AuthorityExportReport,
  AuthorityPolicyLifecycleEventRecord,
  AuthorityPolicyVersionRecord,
} from "./types";

export type AuthorityExportDependencies = {
  now: () => Date;
  listPolicyVersions: (
    params: { fromUtc?: string; toUtc?: string; limit?: number; policyId?: string },
    dependencyOverrides?: Partial<AuthorityPolicyStoreDependencies>
  ) => Promise<AuthorityPolicyVersionRecord[]>;
  listPolicyLifecycleEvents: (
    params: {
      fromUtc?: string;
      toUtc?: string;
      limit?: number;
      policyId?: string;
      policyVersionHash?: string;
    },
    dependencyOverrides?: Partial<AuthorityPolicyStoreDependencies>
  ) => Promise<AuthorityPolicyLifecycleEventRecord[]>;
  listDelegationEvents: (
    params: {
      fromUtc?: string;
      toUtc?: string;
      limit?: number;
      tenantId?: string;
      resource?: string;
      action?: string;
    },
    dependencyOverrides?: Partial<AuthorityDelegationStoreDependencies>
  ) => Promise<AuthorityDelegationEventRecord[]>;
  listApprovalDecisions: (
    params: {
      fromUtc?: string;
      toUtc?: string;
      limit?: number;
      tenantId?: string;
      policyId?: string;
      decision?: "APPROVED" | "DENIED" | "OBSERVED_ALLOW" | "OBSERVED_DENY";
    },
    dependencyOverrides?: Partial<AuthorityDecisionStoreDependencies>
  ) => Promise<AuthorityApprovalDecisionRecord[]>;
};

const defaultDependencies: AuthorityExportDependencies = {
  now: () => new Date(),
  listPolicyVersions: (params, deps) => listAuthorityPolicyVersionsByWindow(params, deps),
  listPolicyLifecycleEvents: (params, deps) => listAuthorityPolicyLifecycleEventsByWindow(params, deps),
  listDelegationEvents: (params, deps) => listAuthorityDelegationEventsByWindow(params, deps),
  listApprovalDecisions: (params, deps) => listAuthorityApprovalDecisionsByWindow(params, deps),
};

function resolveDependencies(overrides: Partial<AuthorityExportDependencies> = {}): AuthorityExportDependencies {
  return {
    ...defaultDependencies,
    ...overrides,
  };
}

function toIsoOrNull(input: unknown): string | null {
  const value = String(input || "").trim();
  if (!value) return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed).toISOString();
}

function sanitizeExportInput(input: {
  source?: "api_internal" | "cli_local" | "cli_http";
  fromUtc?: string;
  toUtc?: string;
  limit?: number;
  tenantId?: string;
  policyId?: string;
}) {
  const now = new Date();
  const toUtc = toIsoOrNull(input.toUtc) || now.toISOString();
  const defaultFrom = new Date(Date.parse(toUtc) - 24 * 60 * 60 * 1000).toISOString();
  const fromUtc = toIsoOrNull(input.fromUtc) || defaultFrom;
  const limit = Math.min(Math.max(Number(input.limit || 1000), 1), 5000);

  return {
    source:
      input.source === "cli_http" || input.source === "cli_local" || input.source === "api_internal"
        ? input.source
        : "api_internal",
    fromUtc,
    toUtc,
    limit,
    tenantId: String(input.tenantId || "").trim() || undefined,
    policyId: String(input.policyId || "").trim() || undefined,
  };
}

function sortPolicyVersions(rows: AuthorityPolicyVersionRecord[]) {
  return [...rows].sort((left, right) => {
    if (left.createdAtUtc !== right.createdAtUtc) return left.createdAtUtc.localeCompare(right.createdAtUtc);
    return left.policyVersionId.localeCompare(right.policyVersionId);
  });
}

function sortPolicyLifecycleEvents(rows: AuthorityPolicyLifecycleEventRecord[]) {
  return [...rows].sort((left, right) => {
    if (left.eventAtUtc !== right.eventAtUtc) return left.eventAtUtc.localeCompare(right.eventAtUtc);
    return left.eventId.localeCompare(right.eventId);
  });
}

function sortDelegationEvents(rows: AuthorityDelegationEventRecord[]) {
  return [...rows].sort((left, right) => {
    if (left.eventAtUtc !== right.eventAtUtc) return left.eventAtUtc.localeCompare(right.eventAtUtc);
    return left.eventId.localeCompare(right.eventId);
  });
}

function sortApprovalDecisions(rows: AuthorityApprovalDecisionRecord[]) {
  return [...rows].sort((left, right) => {
    if (left.decidedAtUtc !== right.decidedAtUtc) return left.decidedAtUtc.localeCompare(right.decidedAtUtc);
    return left.decisionId.localeCompare(right.decisionId);
  });
}

type ChainEvent = {
  artifactClass: string;
  artifactId: string;
  eventAtUtc: string;
  eventHashSha256: string;
};

function buildChainEvents(input: {
  policyVersions: AuthorityPolicyVersionRecord[];
  policyLifecycleEvents: AuthorityPolicyLifecycleEventRecord[];
  delegationEvents: AuthorityDelegationEventRecord[];
  approvalDecisions: AuthorityApprovalDecisionRecord[];
}) {
  const events: ChainEvent[] = [];

  for (const row of input.policyVersions) {
    events.push({
      artifactClass: "authority_policy_version",
      artifactId: row.policyVersionId,
      eventAtUtc: row.createdAtUtc,
      eventHashSha256: canonicalPayloadHash({
        policyVersionId: row.policyVersionId,
        policyId: row.policyId,
        policyVersionHash: row.policyVersionHash,
        policySchemaVersion: row.policySchemaVersion,
        canonicalPolicyJson: row.canonicalPolicyJson,
        createdAtUtc: row.createdAtUtc,
        createdByRole: row.createdByRole,
        createdById: row.createdById,
        idempotencyKey: row.idempotencyKey,
        metadata: row.metadata || null,
      }),
    });
  }

  for (const row of input.policyLifecycleEvents) {
    events.push({
      artifactClass: "authority_policy_lifecycle_event",
      artifactId: row.eventId,
      eventAtUtc: row.eventAtUtc,
      eventHashSha256: row.eventHashSha256,
    });
  }

  for (const row of input.delegationEvents) {
    events.push({
      artifactClass: "authority_delegation_event",
      artifactId: row.eventId,
      eventAtUtc: row.eventAtUtc,
      eventHashSha256: row.eventHashSha256,
    });
  }

  for (const row of input.approvalDecisions) {
    events.push({
      artifactClass: "authority_approval_decision",
      artifactId: row.decisionId,
      eventAtUtc: row.decidedAtUtc,
      eventHashSha256: row.decisionHashSha256,
    });
  }

  return events.sort((left, right) => {
    if (left.eventAtUtc !== right.eventAtUtc) return left.eventAtUtc.localeCompare(right.eventAtUtc);
    if (left.artifactClass !== right.artifactClass) return left.artifactClass.localeCompare(right.artifactClass);
    return left.artifactId.localeCompare(right.artifactId);
  });
}

export async function exportAuthorityEvidencePack(
  input: {
    source?: "api_internal" | "cli_local" | "cli_http";
    fromUtc?: string;
    toUtc?: string;
    limit?: number;
    tenantId?: string;
    policyId?: string;
  },
  dependencyOverrides: Partial<AuthorityExportDependencies> = {}
): Promise<AuthorityExportReport> {
  const deps = resolveDependencies(dependencyOverrides);
  const filters = sanitizeExportInput(input);

  const policyVersions = sortPolicyVersions(
    await deps.listPolicyVersions({
      fromUtc: filters.fromUtc,
      toUtc: filters.toUtc,
      limit: filters.limit,
      policyId: filters.policyId,
    })
  );

  const policyLifecycleEvents = sortPolicyLifecycleEvents(
    await deps.listPolicyLifecycleEvents({
      fromUtc: filters.fromUtc,
      toUtc: filters.toUtc,
      limit: filters.limit,
      policyId: filters.policyId,
    })
  );

  const delegationEvents = sortDelegationEvents(
    await deps.listDelegationEvents({
      fromUtc: filters.fromUtc,
      toUtc: filters.toUtc,
      limit: filters.limit,
      tenantId: filters.tenantId,
    })
  );

  const approvalDecisions = sortApprovalDecisions(
    await deps.listApprovalDecisions({
      fromUtc: filters.fromUtc,
      toUtc: filters.toUtc,
      limit: filters.limit,
      tenantId: filters.tenantId,
      policyId: filters.policyId,
    })
  );

  const chainEvents = buildChainEvents({
    policyVersions,
    policyLifecycleEvents,
    delegationEvents,
    approvalDecisions,
  });

  const hashChain: AuthorityExportReport["hashChain"] = [];
  let chainHash = sha256Hex(`AUTHORITY_GENESIS:${filters.fromUtc}`);

  for (let i = 0; i < chainEvents.length; i += 1) {
    const event = chainEvents[i];
    chainHash = sha256Hex(`${chainHash}:${event.eventHashSha256}`);
    hashChain.push({
      index: i + 1,
      artifactClass: event.artifactClass,
      artifactId: event.artifactId,
      eventAtUtc: event.eventAtUtc,
      eventHashSha256: event.eventHashSha256,
      chainHashSha256: chainHash,
    });
  }

  const summary = {
    policyVersions: policyVersions.length,
    policyLifecycleEvents: policyLifecycleEvents.length,
    delegationEvents: delegationEvents.length,
    approvalDecisions: approvalDecisions.length,
    eventsInHashChain: hashChain.length,
  };

  const deterministicHashSha256 = canonicalPayloadHash({
    filters,
    summary,
    policyVersions,
    policyLifecycleEvents,
    delegationEvents,
    approvalDecisions,
    hashChain,
  });

  const exportRootHash = sha256Hex(`${chainHash}:${deterministicHashSha256}`);

  return {
    reportVersion: "gov04-authority-export.v1",
    generatedAtUtc: deps.now().toISOString(),
    windowStartUtc: filters.fromUtc,
    windowEndUtc: filters.toUtc,
    filters: {
      fromUtc: filters.fromUtc,
      toUtc: filters.toUtc,
      limit: filters.limit,
      source: filters.source,
      tenantId: filters.tenantId,
      policyId: filters.policyId,
    },
    summary,
    policyVersions,
    policyLifecycleEvents,
    delegationEvents,
    approvalDecisions,
    hashChain,
    deterministicHashSha256,
    exportRootHash,
    signatures: {
      scheme: "INTERNAL_UNSIGNED_V1",
      signedAtUtc: deps.now().toISOString(),
      exportRootHash,
      signatureRef: null,
    },
  };
}
