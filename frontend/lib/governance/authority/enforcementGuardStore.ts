import { getDb } from "../../db/mongo";
import {
  assertHexSha256,
  buildDeterministicArtifactId,
  buildDeterministicIdempotencyKey,
  canonicalJson,
  canonicalPayloadHash,
} from "./hash";
import type { AuthorityEnforcementGuardResult } from "./enforcementGuard";
import type { AuthorityShadowMetricsReport } from "./shadowTypes";
import type { AuthorityEnforcementGuardReportRecord } from "./enforcementTypes";

const COLLECTION = "governance_authority_enforcement_guard_reports";

type IndexSpec = Record<string, 1 | -1>;
type IndexOptions = Record<string, unknown>;

type FindCursor = {
  sort: (spec: Record<string, 1 | -1>) => {
    limit: (value: number) => {
      toArray: () => Promise<any[]>;
    };
  };
};

type GuardReportCollection = {
  createIndex: (spec: IndexSpec, options?: IndexOptions) => Promise<unknown>;
  insertOne: (doc: any) => Promise<{ insertedId: { toString: () => string } | string }>;
  findOne: (query: Record<string, unknown>) => Promise<any | null>;
  find: (query: Record<string, unknown>) => FindCursor;
};

export type AuthorityEnforcementGuardStoreDependencies = {
  getCollection: () => Promise<GuardReportCollection>;
  now: () => Date;
};

const defaultDependencies: AuthorityEnforcementGuardStoreDependencies = {
  getCollection: async () => {
    const db = await getDb();
    return db.collection(COLLECTION) as unknown as GuardReportCollection;
  },
  now: () => new Date(),
};

let indexesReady: Promise<void> | null = null;

function resolveDependencies(
  overrides: Partial<AuthorityEnforcementGuardStoreDependencies> = {}
): AuthorityEnforcementGuardStoreDependencies {
  return {
    ...defaultDependencies,
    ...overrides,
  };
}

function toPublicRecord(raw: any): AuthorityEnforcementGuardReportRecord {
  const { _id, ...rest } = raw || {};
  return { ...rest, _id: _id?.toString() } as AuthorityEnforcementGuardReportRecord;
}

export async function ensureAuthorityEnforcementGuardReportIndexes(
  dependencyOverrides: Partial<AuthorityEnforcementGuardStoreDependencies> = {}
): Promise<void> {
  const deps = resolveDependencies(dependencyOverrides);
  if (!indexesReady) {
    indexesReady = (async () => {
      const collection = await deps.getCollection();
      await collection.createIndex({ guardReportId: 1 }, { unique: true, name: "gov_authority_guard_report_id_unique" });
      await collection.createIndex({ idempotencyKey: 1 }, { unique: true, name: "gov_authority_guard_idempotency_unique" });
      await collection.createIndex(
        { evaluatedAtUtc: -1, guardReportId: 1 },
        { name: "gov_authority_guard_evalAt_guardId" }
      );
      await collection.createIndex(
        { overallStatus: 1, evaluatedAtUtc: -1 },
        { name: "gov_authority_guard_status_evalAt" }
      );
      await collection.createIndex(
        { rollbackRecommended: 1, evaluatedAtUtc: -1 },
        { name: "gov_authority_guard_rollback_evalAt" }
      );
      await collection.createIndex(
        { windowStartUtc: 1, windowEndUtc: 1, source: 1 },
        { name: "gov_authority_guard_window_source" }
      );
      await collection.createIndex(
        { reportHashSha256: 1, evaluatedAtUtc: -1 },
        { name: "gov_authority_guard_report_hash_evalAt" }
      );
    })();
  }

  await indexesReady;
}

function buildCanonicalGuardReportPayload(input: {
  report: AuthorityShadowMetricsReport;
  guard: AuthorityEnforcementGuardResult;
  metadata?: Record<string, unknown>;
}) {
  return {
    reportVersion: String(input.report.reportVersion || "").trim(),
    source: input.report.source,
    windowStartUtc: String(input.report.windowStartUtc || "").trim(),
    windowEndUtc: String(input.report.windowEndUtc || "").trim(),
    reportHashSha256: String(input.report.deterministicHashSha256 || "").trim().toLowerCase(),
    overallStatus: input.guard.overallStatus,
    rollbackRecommended: Boolean(input.guard.rollbackRecommended),
    killSwitchAction: input.guard.killSwitchAction,
    signals: (input.guard.signals || [])
      .map((signal) => ({
        signalCode: signal.signalCode,
        value: Number(signal.value || 0),
        warnThreshold: Number(signal.warnThreshold || 0),
        pageThreshold: Number(signal.pageThreshold || 0),
        status: signal.status,
      }))
      .sort((left, right) => left.signalCode.localeCompare(right.signalCode)),
    evaluatedAtUtc: String(input.guard.evaluatedAtUtc || "").trim(),
    metadata: input.metadata || null,
  } as const;
}

export type AppendAuthorityEnforcementGuardReportInput = {
  report: AuthorityShadowMetricsReport;
  guard: AuthorityEnforcementGuardResult;
  metadata?: Record<string, unknown>;
};

export async function appendAuthorityEnforcementGuardReport(
  input: AppendAuthorityEnforcementGuardReportInput,
  dependencyOverrides: Partial<AuthorityEnforcementGuardStoreDependencies> = {}
): Promise<{ created: boolean; record: AuthorityEnforcementGuardReportRecord }> {
  await ensureAuthorityEnforcementGuardReportIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const collection = await deps.getCollection();

  const canonicalPayload = buildCanonicalGuardReportPayload({
    report: input.report,
    guard: input.guard,
    metadata: input.metadata,
  });
  assertHexSha256(canonicalPayload.reportHashSha256, "reportHashSha256");

  const canonicalGuardJson = canonicalJson(canonicalPayload);
  const deterministicHashSha256 = canonicalPayloadHash(canonicalPayload);

  const guardReportId = buildDeterministicArtifactId({
    artifactClass: "authority_enforcement_guard_report",
    tenantId: "",
    primaryKeyFields: [
      canonicalPayload.source,
      canonicalPayload.windowStartUtc,
      canonicalPayload.windowEndUtc,
      canonicalPayload.reportHashSha256,
      canonicalPayload.overallStatus,
    ],
    canonicalPayloadHash: deterministicHashSha256,
  });

  const idempotencyKey = buildDeterministicIdempotencyKey({
    artifactClass: "authority_enforcement_guard_report",
    tenantId: "",
    primaryKeyFields: [
      canonicalPayload.source,
      canonicalPayload.windowStartUtc,
      canonicalPayload.windowEndUtc,
      canonicalPayload.reportHashSha256,
      canonicalPayload.overallStatus,
    ],
    canonicalPayloadHash: deterministicHashSha256,
  });

  const record: AuthorityEnforcementGuardReportRecord = {
    guardReportId,
    idempotencyKey,
    reportVersion: canonicalPayload.reportVersion,
    source: canonicalPayload.source,
    windowStartUtc: canonicalPayload.windowStartUtc,
    windowEndUtc: canonicalPayload.windowEndUtc,
    reportHashSha256: canonicalPayload.reportHashSha256,
    overallStatus: canonicalPayload.overallStatus,
    rollbackRecommended: canonicalPayload.rollbackRecommended,
    killSwitchAction: canonicalPayload.killSwitchAction,
    signals: canonicalPayload.signals,
    deterministicHashSha256,
    canonicalGuardJson,
    evaluatedAtUtc: canonicalPayload.evaluatedAtUtc,
    metadata: input.metadata,
    createdAtUtc: deps.now().toISOString(),
  };

  try {
    const inserted = await collection.insertOne(record as any);
    return {
      created: true,
      record: {
        ...record,
        _id: typeof inserted.insertedId === "string" ? inserted.insertedId : inserted.insertedId.toString(),
      },
    };
  } catch (error: any) {
    if (error?.code === 11000) {
      const existing =
        (await collection.findOne({ guardReportId })) || (await collection.findOne({ idempotencyKey }));
      if (existing) return { created: false, record: toPublicRecord(existing) };
    }
    throw error;
  }
}

export async function listAuthorityEnforcementGuardReportsByWindow(
  params: {
    fromUtc?: string;
    toUtc?: string;
    limit?: number;
    source?: "api_internal" | "cli_local" | "cli_http";
    overallStatus?: "OK" | "WARN" | "PAGE";
    rollbackRecommended?: boolean;
  },
  dependencyOverrides: Partial<AuthorityEnforcementGuardStoreDependencies> = {}
): Promise<AuthorityEnforcementGuardReportRecord[]> {
  await ensureAuthorityEnforcementGuardReportIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const collection = await deps.getCollection();

  const query: Record<string, unknown> = {};
  if (params.source) query.source = params.source;
  if (params.overallStatus) query.overallStatus = params.overallStatus;
  if (typeof params.rollbackRecommended === "boolean") query.rollbackRecommended = params.rollbackRecommended;

  const range: Record<string, string> = {};
  const fromUtc = String(params.fromUtc || "").trim();
  const toUtc = String(params.toUtc || "").trim();
  if (fromUtc) range.$gte = fromUtc;
  if (toUtc) range.$lte = toUtc;
  if (Object.keys(range).length > 0) query.evaluatedAtUtc = range;

  const limit = Math.min(Math.max(Number(params.limit || 500), 1), 5000);
  const docs = await collection.find(query).sort({ evaluatedAtUtc: -1, guardReportId: 1 }).limit(limit).toArray();
  return docs.map(toPublicRecord);
}
