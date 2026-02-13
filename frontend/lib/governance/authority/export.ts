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
import {
  listAuthorityShadowDecisionsByWindow,
  type AuthorityShadowStoreDependencies,
} from "./shadowStore";
import {
  listAuthorityShadowOverrideCaseEventsByWindow,
  listAuthorityShadowOverrideCasesByWindow,
  type AuthorityShadowCaseStoreDependencies,
} from "./shadowCaseStore";
import type {
  AuthorityApprovalDecisionRecord,
  AuthorityDelegationEventRecord,
  AuthorityExportReport,
  AuthorityPolicyLifecycleEventRecord,
  AuthorityPolicyVersionRecord,
} from "./types";
import type {
  AuthorityShadowDecisionRecord,
  AuthorityShadowOverrideCaseEventRecord,
  AuthorityShadowOverrideCaseRecord,
} from "./shadowTypes";

export type AuthorityExportSchemaVersion = "v1" | "v2";

export type AuthorityExportReportV2 = {
  reportVersion: "gov04-authority-export.v2";
  schemaVersion: "v2";
  authorityPhase: "shadow";
  generatedAtUtc: string;
  windowStartUtc: string;
  windowEndUtc: string;
  filters: {
    fromUtc: string;
    toUtc: string;
    limit: number;
    source: "api_internal" | "cli_local" | "cli_http";
    tenantId?: string;
    policyId?: string;
    includeShadowArtifacts: boolean;
  };
  summary: {
    policyVersions: number;
    policyLifecycleEvents: number;
    delegationEvents: number;
    approvalDecisions: number;
    shadowDecisions: number;
    shadowOverrideCases: number;
    shadowOverrideCaseEvents: number;
    eventsInHashChain: number;
  };
  policyVersions: AuthorityPolicyVersionRecord[];
  policyLifecycleEvents: AuthorityPolicyLifecycleEventRecord[];
  delegationEvents: AuthorityDelegationEventRecord[];
  approvalDecisions: AuthorityApprovalDecisionRecord[];
  shadowDecisions: AuthorityShadowDecisionRecord[];
  shadowOverrideCases: AuthorityShadowOverrideCaseRecord[];
  shadowOverrideCaseEvents: AuthorityShadowOverrideCaseEventRecord[];
  hashChain: Array<{
    index: number;
    artifactClass: string;
    artifactId: string;
    eventAtUtc: string;
    eventHashSha256: string;
    chainHashSha256: string;
  }>;
  deterministicHashSha256: string;
  exportRootHash: string;
  signatures: {
    scheme: "INTERNAL_UNSIGNED_V1";
    signedAtUtc: string;
    exportRootHash: string;
    signatureRef: string | null;
  };
};

export type AuthorityExportResult = AuthorityExportReport | AuthorityExportReportV2;

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
      grantorActorId?: string;
      granteeActorId?: string;
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
  listShadowDecisions: (
    params: {
      fromUtc?: string;
      toUtc?: string;
      limit?: number;
      tenantId?: string;
      policyId?: string;
      resource?: string;
      action?: string;
    },
    dependencyOverrides?: Partial<AuthorityShadowStoreDependencies>
  ) => Promise<AuthorityShadowDecisionRecord[]>;
  listShadowOverrideCases: (
    params: {
      fromUtc?: string;
      toUtc?: string;
      limit?: number;
      tenantId?: string;
      status?: "OPEN" | "ACKNOWLEDGED" | "CLOSED";
      policyId?: string;
    },
    dependencyOverrides?: Partial<AuthorityShadowCaseStoreDependencies>
  ) => Promise<AuthorityShadowOverrideCaseRecord[]>;
  listShadowOverrideCaseEvents: (
    params: {
      fromUtc?: string;
      toUtc?: string;
      limit?: number;
      caseId?: string;
      eventType?: "CASE_OPENED" | "CASE_ACKNOWLEDGED" | "CASE_CLOSED" | "DECISION_LINKED";
    },
    dependencyOverrides?: Partial<AuthorityShadowCaseStoreDependencies>
  ) => Promise<AuthorityShadowOverrideCaseEventRecord[]>;
};

const defaultDependencies: AuthorityExportDependencies = {
  now: () => new Date(),
  listPolicyVersions: (params, deps) => listAuthorityPolicyVersionsByWindow(params, deps),
  listPolicyLifecycleEvents: (params, deps) => listAuthorityPolicyLifecycleEventsByWindow(params, deps),
  listDelegationEvents: (params, deps) => listAuthorityDelegationEventsByWindow(params, deps),
  listApprovalDecisions: (params, deps) => listAuthorityApprovalDecisionsByWindow(params, deps),
  listShadowDecisions: (params, deps) => listAuthorityShadowDecisionsByWindow(params, deps),
  listShadowOverrideCases: (params, deps) => listAuthorityShadowOverrideCasesByWindow(params, deps),
  listShadowOverrideCaseEvents: (params, deps) => listAuthorityShadowOverrideCaseEventsByWindow(params, deps),
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
  schemaVersion?: AuthorityExportSchemaVersion;
  includeShadowArtifacts?: boolean;
}) {
  const now = new Date();
  const toUtc = toIsoOrNull(input.toUtc) || now.toISOString();
  const defaultFrom = new Date(Date.parse(toUtc) - 24 * 60 * 60 * 1000).toISOString();
  const fromUtc = toIsoOrNull(input.fromUtc) || defaultFrom;
  const limit = Math.min(Math.max(Number(input.limit || 1000), 1), 5000);
  const schemaVersion: AuthorityExportSchemaVersion = input.schemaVersion === "v1" ? "v1" : "v2";
  const includeShadowArtifacts =
    schemaVersion === "v2" ? input.includeShadowArtifacts !== false : false;

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
    schemaVersion,
    includeShadowArtifacts,
  };
}

function sortRows<T>(
  rows: T[],
  comparator: (left: T, right: T) => number
) {
  return [...rows].sort(comparator);
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
  shadowDecisions: AuthorityShadowDecisionRecord[];
  shadowOverrideCases: AuthorityShadowOverrideCaseRecord[];
  shadowOverrideCaseEvents: AuthorityShadowOverrideCaseEventRecord[];
  includeShadowArtifacts: boolean;
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

  if (input.includeShadowArtifacts) {
    for (const row of input.shadowDecisions) {
      events.push({
        artifactClass: "authority_shadow_decision",
        artifactId: row.decisionId,
        eventAtUtc: row.decidedAtUtc,
        eventHashSha256: row.decisionHashSha256,
      });
    }

    for (const row of input.shadowOverrideCases) {
      events.push({
        artifactClass: "authority_shadow_override_case",
        artifactId: row.caseId,
        eventAtUtc: row.openedAtUtc,
        eventHashSha256: canonicalPayloadHash({
          caseId: row.caseId,
          caseKeyHashSha256: row.caseKeyHashSha256,
          idempotencyKey: row.idempotencyKey,
          tenantId: row.tenantId || null,
          policyId: row.policyId,
          policyVersionHash: row.policyVersionHash || null,
          subjectActorId: row.subjectActorId,
          resource: row.resource,
          action: row.action,
          status: row.status,
          openedByDecisionId: row.openedByDecisionId,
          openedAtUtc: row.openedAtUtc,
          metadata: row.metadata || null,
          createdAtUtc: row.createdAtUtc,
          updatedAtUtc: row.updatedAtUtc,
        }),
      });
    }

    for (const row of input.shadowOverrideCaseEvents) {
      events.push({
        artifactClass: "authority_shadow_override_case_event",
        artifactId: row.eventId,
        eventAtUtc: row.eventAtUtc,
        eventHashSha256: row.eventHashSha256,
      });
    }
  }

  return sortRows(events, (left, right) => {
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
    schemaVersion?: AuthorityExportSchemaVersion;
    includeShadowArtifacts?: boolean;
  },
  dependencyOverrides: Partial<AuthorityExportDependencies> = {}
): Promise<AuthorityExportResult> {
  const deps = resolveDependencies(dependencyOverrides);
  const filters = sanitizeExportInput(input);

  const policyVersions = sortRows(
    await deps.listPolicyVersions({
      fromUtc: filters.fromUtc,
      toUtc: filters.toUtc,
      limit: filters.limit,
      policyId: filters.policyId,
    }),
    (left, right) => {
      if (left.createdAtUtc !== right.createdAtUtc) return left.createdAtUtc.localeCompare(right.createdAtUtc);
      return left.policyVersionId.localeCompare(right.policyVersionId);
    }
  );

  const policyLifecycleEvents = sortRows(
    await deps.listPolicyLifecycleEvents({
      fromUtc: filters.fromUtc,
      toUtc: filters.toUtc,
      limit: filters.limit,
      policyId: filters.policyId,
    }),
    (left, right) => {
      if (left.eventAtUtc !== right.eventAtUtc) return left.eventAtUtc.localeCompare(right.eventAtUtc);
      return left.eventId.localeCompare(right.eventId);
    }
  );

  const delegationEvents = sortRows(
    await deps.listDelegationEvents({
      fromUtc: filters.fromUtc,
      toUtc: filters.toUtc,
      limit: filters.limit,
      tenantId: filters.tenantId,
    }),
    (left, right) => {
      if (left.eventAtUtc !== right.eventAtUtc) return left.eventAtUtc.localeCompare(right.eventAtUtc);
      return left.eventId.localeCompare(right.eventId);
    }
  );

  const approvalDecisions = sortRows(
    await deps.listApprovalDecisions({
      fromUtc: filters.fromUtc,
      toUtc: filters.toUtc,
      limit: filters.limit,
      tenantId: filters.tenantId,
      policyId: filters.policyId,
    }),
    (left, right) => {
      if (left.decidedAtUtc !== right.decidedAtUtc) return left.decidedAtUtc.localeCompare(right.decidedAtUtc);
      return left.decisionId.localeCompare(right.decisionId);
    }
  );

  const shadowDecisions = filters.includeShadowArtifacts
    ? sortRows(
        await deps.listShadowDecisions({
          fromUtc: filters.fromUtc,
          toUtc: filters.toUtc,
          limit: filters.limit,
          tenantId: filters.tenantId,
          policyId: filters.policyId,
        }),
        (left, right) => {
          if (left.decidedAtUtc !== right.decidedAtUtc) return left.decidedAtUtc.localeCompare(right.decidedAtUtc);
          return left.decisionId.localeCompare(right.decisionId);
        }
      )
    : [];

  const shadowOverrideCases = filters.includeShadowArtifacts
    ? sortRows(
        await deps.listShadowOverrideCases({
          fromUtc: filters.fromUtc,
          toUtc: filters.toUtc,
          limit: filters.limit,
          tenantId: filters.tenantId,
          policyId: filters.policyId,
        }),
        (left, right) => {
          if (left.openedAtUtc !== right.openedAtUtc) return left.openedAtUtc.localeCompare(right.openedAtUtc);
          return left.caseId.localeCompare(right.caseId);
        }
      )
    : [];

  const shadowOverrideCaseEvents = filters.includeShadowArtifacts
    ? sortRows(
        await deps.listShadowOverrideCaseEvents({
          fromUtc: filters.fromUtc,
          toUtc: filters.toUtc,
          limit: filters.limit,
        }),
        (left, right) => {
          if (left.eventAtUtc !== right.eventAtUtc) return left.eventAtUtc.localeCompare(right.eventAtUtc);
          return left.eventId.localeCompare(right.eventId);
        }
      )
    : [];

  const chainEvents = buildChainEvents({
    policyVersions,
    policyLifecycleEvents,
    delegationEvents,
    approvalDecisions,
    shadowDecisions,
    shadowOverrideCases,
    shadowOverrideCaseEvents,
    includeShadowArtifacts: filters.includeShadowArtifacts,
  });

  const hashChain: Array<{
    index: number;
    artifactClass: string;
    artifactId: string;
    eventAtUtc: string;
    eventHashSha256: string;
    chainHashSha256: string;
  }> = [];
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

  if (filters.schemaVersion === "v1" || !filters.includeShadowArtifacts) {
    const summary = {
      policyVersions: policyVersions.length,
      policyLifecycleEvents: policyLifecycleEvents.length,
      delegationEvents: delegationEvents.length,
      approvalDecisions: approvalDecisions.length,
      eventsInHashChain: hashChain.length,
    };

    const deterministicHashSha256 = canonicalPayloadHash({
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

  const summary = {
    policyVersions: policyVersions.length,
    policyLifecycleEvents: policyLifecycleEvents.length,
    delegationEvents: delegationEvents.length,
    approvalDecisions: approvalDecisions.length,
    shadowDecisions: shadowDecisions.length,
    shadowOverrideCases: shadowOverrideCases.length,
    shadowOverrideCaseEvents: shadowOverrideCaseEvents.length,
    eventsInHashChain: hashChain.length,
  };

  const deterministicHashSha256 = canonicalPayloadHash({
    filters: {
      fromUtc: filters.fromUtc,
      toUtc: filters.toUtc,
      limit: filters.limit,
      source: filters.source,
      tenantId: filters.tenantId,
      policyId: filters.policyId,
      includeShadowArtifacts: true,
    },
    summary,
    policyVersions,
    policyLifecycleEvents,
    delegationEvents,
    approvalDecisions,
    shadowDecisions,
    shadowOverrideCases,
    shadowOverrideCaseEvents,
    hashChain,
  });

  const exportRootHash = sha256Hex(`${chainHash}:${deterministicHashSha256}`);

  return {
    reportVersion: "gov04-authority-export.v2",
    schemaVersion: "v2",
    authorityPhase: "shadow",
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
      includeShadowArtifacts: true,
    },
    summary,
    policyVersions,
    policyLifecycleEvents,
    delegationEvents,
    approvalDecisions,
    shadowDecisions,
    shadowOverrideCases,
    shadowOverrideCaseEvents,
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
