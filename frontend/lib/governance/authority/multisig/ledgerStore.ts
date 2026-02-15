import crypto from "node:crypto";
import { getAdminMemoryCollection } from "../../../adminDashboard/memoryCollection";
import type {
  AuthorityMultisigApprovalEntryRecord,
  AuthorityMultisigProposalRecord,
  AuthorityMultisigQuorumSnapshotRecord,
} from "./types";

export const AUTHORITY_MULTISIG_PROPOSAL_COLLECTION = "authority_multisig_proposals";
export const AUTHORITY_MULTISIG_APPROVAL_COLLECTION = "authority_multisig_approval_entries";
export const AUTHORITY_MULTISIG_QUORUM_COLLECTION = "authority_multisig_quorum_snapshots";

type CollectionLike = {
  createIndex: (spec: Record<string, 1 | -1>, options?: Record<string, unknown>) => Promise<unknown>;
  insertOne: (doc: Record<string, unknown>) => Promise<{ insertedId?: unknown }>;
  find: (query: Record<string, unknown>) => {
    sort: (spec: Record<string, 1 | -1>) => {
      limit: (value: number) => {
        toArray: () => Promise<Array<Record<string, unknown>>>;
      };
    };
  };
  findOne?: (query: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
};

type LedgerDependencies = {
  getCollection: (name: string) => Promise<CollectionLike>;
};

const defaultDependencies: LedgerDependencies = {
  getCollection: async (name: string) => {
    if (!process.env.MONGODB_URI && process.env.NODE_ENV !== "production") {
      return getAdminMemoryCollection(name) as unknown as CollectionLike;
    }
    const { getDb } = await import("../../../db/mongo");
    const db = await getDb();
    return db.collection(name) as unknown as CollectionLike;
  },
};

const indexInitPromiseByCollection = new Map<string, Promise<void>>();

async function ensureIndexes(collectionName: string, collection: CollectionLike) {
  if (indexInitPromiseByCollection.has(collectionName)) {
    return indexInitPromiseByCollection.get(collectionName)!;
  }

  const setupPromise = (async () => {
    if (collectionName === AUTHORITY_MULTISIG_PROPOSAL_COLLECTION) {
      await collection.createIndex({ proposalId: 1 }, { unique: true, name: "proposal_id_unique" });
      await collection.createIndex({ proposalType: 1, createdAtUtc: -1 }, { name: "proposal_type_createdAt" });
      await collection.createIndex({ status: 1, createdAtUtc: -1 }, { name: "proposal_status_createdAt" });
    } else if (collectionName === AUTHORITY_MULTISIG_APPROVAL_COLLECTION) {
      await collection.createIndex({ entryId: 1 }, { unique: true, name: "approval_entry_id_unique" });
      await collection.createIndex({ proposalId: 1, signedAtUtc: 1 }, { name: "approval_proposal_signedAt" });
      await collection.createIndex({ proposalId: 1, approverId: 1 }, { name: "approval_proposal_approver" });
    } else if (collectionName === AUTHORITY_MULTISIG_QUORUM_COLLECTION) {
      await collection.createIndex({ snapshotId: 1 }, { unique: true, name: "quorum_snapshot_id_unique" });
      await collection.createIndex({ proposalId: 1, computedAtUtc: -1 }, { name: "quorum_proposal_computedAt" });
    }
  })();

  indexInitPromiseByCollection.set(collectionName, setupPromise);
  return setupPromise;
}

function resolveDependencies(overrides: Partial<LedgerDependencies> = {}): LedgerDependencies {
  return {
    ...defaultDependencies,
    ...overrides,
  };
}

export function buildDeterministicId(prefix: string, input: string) {
  const digest = crypto.createHash("sha256").update(input, "utf8").digest("hex").slice(0, 24);
  return `${prefix}-${digest}`;
}

export async function appendAuthorityMultisigProposal(
  record: AuthorityMultisigProposalRecord,
  overrides: Partial<LedgerDependencies> = {}
) {
  const deps = resolveDependencies(overrides);
  const collection = await deps.getCollection(AUTHORITY_MULTISIG_PROPOSAL_COLLECTION);
  await ensureIndexes(AUTHORITY_MULTISIG_PROPOSAL_COLLECTION, collection);
  await collection.insertOne(record as unknown as Record<string, unknown>);
  return record;
}

export async function appendAuthorityMultisigApprovalEntry(
  record: AuthorityMultisigApprovalEntryRecord,
  overrides: Partial<LedgerDependencies> = {}
) {
  const deps = resolveDependencies(overrides);
  const collection = await deps.getCollection(AUTHORITY_MULTISIG_APPROVAL_COLLECTION);
  await ensureIndexes(AUTHORITY_MULTISIG_APPROVAL_COLLECTION, collection);
  await collection.insertOne(record as unknown as Record<string, unknown>);
  return record;
}

export async function appendAuthorityMultisigQuorumSnapshot(
  record: AuthorityMultisigQuorumSnapshotRecord,
  overrides: Partial<LedgerDependencies> = {}
) {
  const deps = resolveDependencies(overrides);
  const collection = await deps.getCollection(AUTHORITY_MULTISIG_QUORUM_COLLECTION);
  await ensureIndexes(AUTHORITY_MULTISIG_QUORUM_COLLECTION, collection);
  await collection.insertOne(record as unknown as Record<string, unknown>);
  return record;
}

export async function listAuthorityMultisigApprovalEntriesByProposalId(
  proposalId: string,
  input: { limit?: number } = {},
  overrides: Partial<LedgerDependencies> = {}
) {
  const deps = resolveDependencies(overrides);
  const collection = await deps.getCollection(AUTHORITY_MULTISIG_APPROVAL_COLLECTION);
  await ensureIndexes(AUTHORITY_MULTISIG_APPROVAL_COLLECTION, collection);
  const limit = Math.max(1, Math.min(Math.floor(input.limit || 500), 5_000));
  const rows = await collection.find({ proposalId }).sort({ signedAtUtc: 1 }).limit(limit).toArray();
  return rows as AuthorityMultisigApprovalEntryRecord[];
}

export async function listAuthorityMultisigQuorumSnapshotsByProposalId(
  proposalId: string,
  input: { limit?: number } = {},
  overrides: Partial<LedgerDependencies> = {}
) {
  const deps = resolveDependencies(overrides);
  const collection = await deps.getCollection(AUTHORITY_MULTISIG_QUORUM_COLLECTION);
  await ensureIndexes(AUTHORITY_MULTISIG_QUORUM_COLLECTION, collection);
  const limit = Math.max(1, Math.min(Math.floor(input.limit || 200), 2_000));
  const rows = await collection.find({ proposalId }).sort({ computedAtUtc: -1 }).limit(limit).toArray();
  return rows as AuthorityMultisigQuorumSnapshotRecord[];
}
