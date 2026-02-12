import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import Database from "better-sqlite3";
import {
  ContactChannels,
  DispatchStatuses,
  PlacementStatuses,
  PlacementTiers,
  PublicEntityTypes,
  SnapshotStatuses,
  VerificationStatuses,
  ApprovalStatuses,
  type ContactChannel,
  type PlacementContract,
  type PlacementLock,
  type PlacementStatus,
  type PlacementTier,
  type PublicContactRequest,
  type PublicDispatchEvent,
  type DispatchStatus,
  type PublicEntityType,
  type PublicParticipantProfile,
  type PublicSiteSnapshot,
  type SnapshotStatus,
  type VerificationStatus,
  type ApprovalStatus,
} from "./types";

type SqliteDatabase = InstanceType<typeof Database>;

type UpsertProfileInput = {
  entityId: string;
  entityType: PublicEntityType;
  desiredSlug: string;
};

type UpdateProfileStatusesInput = {
  profileId: string;
  approvalStatus?: ApprovalStatus;
  certificationStatus?: VerificationStatus;
  insuranceStatus?: VerificationStatus;
  verificationBadges?: {
    rreVerified?: boolean;
    complianceVerified?: boolean;
    insuranceVerified?: boolean;
  };
};

type UpsertDraftInput = {
  entityId: string;
  entityType: PublicEntityType;
  contentJSON: Record<string, unknown>;
  seoMeta?: {
    title?: string;
    description?: string;
    ogImageAssetId?: string;
    canonicalPath?: string;
  };
  heroImage?: string;
  logo?: string;
  desiredSlug?: string;
};

type PublishDraftInput = {
  entityId: string;
  entityType: PublicEntityType;
  adminId: string;
  renderedHash: string;
};

type CreateContactRequestInput = {
  entityId: string;
  entityType: PublicEntityType;
  buyerId: string | null;
  name: string;
  email: string;
  message: string;
  channel: ContactChannel;
};

type CreatePlacementContractInput = {
  entityId: string;
  entityType: PublicEntityType;
  tier: PlacementTier;
  weeklyFeeAUD: number;
  autoRenew: boolean;
  status: PlacementStatus;
  startWeekId: string | null;
  endWeekId: string | null;
};

type UpsertPlacementLockInput = {
  weekId: string;
  entityId: string;
  entityType: PublicEntityType;
  contractId: string;
  tier: PlacementTier;
  position: number;
  snapshotVersion: number;
  lockHash: string;
  lockedAt: string;
  lockedBy: string | null;
};

function nowIso() {
  return new Date().toISOString();
}

function normalizeBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const lowered = value.trim().toLowerCase();
    if (["1", "true", "yes", "y"].includes(lowered)) return true;
    if (["0", "false", "no", "n"].includes(lowered)) return false;
  }
  return fallback;
}

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function generateId(prefix: string) {
  const token = crypto.randomBytes(8).toString("hex");
  return `${prefix}-${token}`;
}

function databasePath() {
  const configured = process.env.PUBLIC_SITES_DB_PATH;
  if (configured && configured.trim().length > 0) {
    return path.resolve(configured.trim());
  }
  return path.resolve(process.cwd(), ".data", "public-sites.sqlite");
}

function ensureDataDirectory(filePath: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function createDatabaseConnection() {
  const filePath = databasePath();
  ensureDataDirectory(filePath);
  const sqlite = new Database(filePath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  return sqlite;
}

function ensureSchema(sqlite: SqliteDatabase) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS public_participant_profiles (
      id TEXT PRIMARY KEY,
      entity_id TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      approval_status TEXT NOT NULL,
      certification_status TEXT NOT NULL,
      insurance_status TEXT NOT NULL,
      verification_badges_json TEXT NOT NULL,
      slug_locked INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(entity_id, entity_type)
    );

    CREATE TABLE IF NOT EXISTS public_site_snapshots (
      id TEXT PRIMARY KEY,
      entity_id TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      version INTEGER NOT NULL,
      status TEXT NOT NULL,
      content_json TEXT NOT NULL,
      rendered_hash TEXT,
      published_at TEXT,
      published_by TEXT,
      previous_version_id TEXT,
      seo_meta_json TEXT NOT NULL,
      hero_image TEXT NOT NULL,
      logo TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(entity_id, entity_type, version)
    );

    CREATE TABLE IF NOT EXISTS public_contact_requests (
      id TEXT PRIMARY KEY,
      entity_id TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      buyer_id TEXT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      message TEXT NOT NULL,
      channel TEXT NOT NULL,
      dispatch_status TEXT NOT NULL,
      dispatch_hash TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS public_contact_dispatch_events (
      id TEXT PRIMARY KEY,
      event_code TEXT NOT NULL,
      ref_type TEXT NOT NULL,
      ref_id TEXT NOT NULL,
      dispatch_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS placement_contracts (
      id TEXT PRIMARY KEY,
      entity_id TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      tier TEXT NOT NULL,
      weekly_fee_aud REAL NOT NULL,
      auto_renew INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL,
      start_week_id TEXT,
      end_week_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS placement_locks (
      id TEXT PRIMARY KEY,
      week_id TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      contract_id TEXT NOT NULL,
      tier TEXT NOT NULL,
      position INTEGER NOT NULL,
      snapshot_version INTEGER NOT NULL,
      lock_hash TEXT NOT NULL,
      locked_at TEXT NOT NULL,
      locked_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(week_id, tier, position),
      UNIQUE(week_id, entity_id)
    );

    CREATE INDEX IF NOT EXISTS idx_public_profiles_entity_type_status ON public_participant_profiles(entity_type, approval_status);
    CREATE INDEX IF NOT EXISTS idx_public_snapshots_entity_status ON public_site_snapshots(entity_type, status);
    CREATE INDEX IF NOT EXISTS idx_public_snapshots_hash ON public_site_snapshots(rendered_hash);
    CREATE INDEX IF NOT EXISTS idx_public_contact_entity_created ON public_contact_requests(entity_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_placement_contracts_entity_status ON placement_contracts(entity_id, status);
    CREATE INDEX IF NOT EXISTS idx_placement_locks_week ON placement_locks(week_id);
  `);
}

function maybeResetStore(sqlite: SqliteDatabase) {
  if (process.env.PUBLIC_SITES_RESET_ON_BOOT !== "1") return;
  sqlite.exec(`
    DELETE FROM placement_locks;
    DELETE FROM placement_contracts;
    DELETE FROM public_contact_dispatch_events;
    DELETE FROM public_contact_requests;
    DELETE FROM public_site_snapshots;
    DELETE FROM public_participant_profiles;
  `);
}

function initializeDatabase(sqlite: SqliteDatabase) {
  ensureSchema(sqlite);
  maybeResetStore(sqlite);
  ensureSchema(sqlite);
}

function mapProfile(row: any): PublicParticipantProfile {
  return {
    id: row.id,
    entityId: row.entity_id,
    entityType: row.entity_type,
    slug: row.slug,
    approvalStatus: row.approval_status,
    certificationStatus: row.certification_status,
    insuranceStatus: row.insurance_status,
    verificationBadges: parseJson(row.verification_badges_json, {
      rreVerified: false,
      complianceVerified: false,
      insuranceVerified: false,
    }),
    slugLocked: normalizeBoolean(row.slug_locked),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSnapshot(row: any): PublicSiteSnapshot {
  return {
    id: row.id,
    entityId: row.entity_id,
    entityType: row.entity_type,
    version: Number(row.version),
    status: row.status,
    contentJSON: parseJson(row.content_json, {}),
    renderedHash: row.rendered_hash || null,
    publishedAt: row.published_at || null,
    publishedBy: row.published_by || null,
    previousVersionId: row.previous_version_id || null,
    seoMeta: parseJson(row.seo_meta_json, {
      title: "",
      description: "",
      ogImageAssetId: "",
      canonicalPath: "",
    }),
    heroImage: row.hero_image || "",
    logo: row.logo || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapContactRequest(row: any): PublicContactRequest {
  return {
    id: row.id,
    entityId: row.entity_id,
    entityType: row.entity_type,
    buyerId: row.buyer_id || null,
    name: row.name,
    email: row.email,
    message: row.message,
    channel: row.channel,
    dispatchStatus: row.dispatch_status,
    dispatchHash: row.dispatch_hash || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPlacementContract(row: any): PlacementContract {
  return {
    id: row.id,
    entityId: row.entity_id,
    entityType: row.entity_type,
    tier: row.tier,
    weeklyFeeAUD: Number(row.weekly_fee_aud),
    autoRenew: normalizeBoolean(row.auto_renew, true),
    status: row.status,
    startWeekId: row.start_week_id || null,
    endWeekId: row.end_week_id || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPlacementLock(row: any): PlacementLock {
  return {
    id: row.id,
    weekId: row.week_id,
    entityId: row.entity_id,
    entityType: row.entity_type,
    contractId: row.contract_id,
    tier: row.tier,
    position: Number(row.position),
    snapshotVersion: Number(row.snapshot_version),
    lockHash: row.lock_hash,
    lockedAt: row.locked_at,
    lockedBy: row.locked_by || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDispatchEvent(row: any): PublicDispatchEvent {
  return {
    id: row.id,
    eventCode: row.event_code,
    refType: row.ref_type,
    refId: row.ref_id,
    dispatchHash: row.dispatch_hash,
    createdAt: row.created_at,
  };
}

export function isPublicEntityType(value: string): value is PublicEntityType {
  return PublicEntityTypes.includes(value as PublicEntityType);
}

export function isApprovalStatus(value: string): value is ApprovalStatus {
  return ApprovalStatuses.includes(value as ApprovalStatus);
}

export function isVerificationStatus(value: string): value is VerificationStatus {
  return VerificationStatuses.includes(value as VerificationStatus);
}

export function isSnapshotStatus(value: string): value is SnapshotStatus {
  return SnapshotStatuses.includes(value as SnapshotStatus);
}

export function isPlacementTier(value: string): value is PlacementTier {
  return PlacementTiers.includes(value as PlacementTier);
}

export function isPlacementStatus(value: string): value is PlacementStatus {
  return PlacementStatuses.includes(value as PlacementStatus);
}

export function isContactChannel(value: string): value is ContactChannel {
  return ContactChannels.includes(value as ContactChannel);
}

export function isDispatchStatus(value: string): value is DispatchStatus {
  return DispatchStatuses.includes(value as DispatchStatus);
}

function getPublicSitesDatabase() {
  const globalScope = globalThis as unknown as { __publicSitesSqlite?: SqliteDatabase };
  if (!globalScope.__publicSitesSqlite) {
    const sqlite = createDatabaseConnection();
    initializeDatabase(sqlite);
    globalScope.__publicSitesSqlite = sqlite;
  }
  return globalScope.__publicSitesSqlite;
}

export function listProfiles(entityType?: PublicEntityType) {
  const sqlite = getPublicSitesDatabase();
  const rows = entityType
    ? sqlite
        .prepare("SELECT * FROM public_participant_profiles WHERE entity_type = ? ORDER BY updated_at DESC")
        .all(entityType)
    : sqlite.prepare("SELECT * FROM public_participant_profiles ORDER BY updated_at DESC").all();
  return rows.map(mapProfile);
}

export function findProfileById(profileId: string) {
  const sqlite = getPublicSitesDatabase();
  const row = sqlite.prepare("SELECT * FROM public_participant_profiles WHERE id = ?").get(profileId) as any;
  return row ? mapProfile(row) : null;
}

export function findProfileByEntity(entityId: string, entityType: PublicEntityType) {
  const sqlite = getPublicSitesDatabase();
  const row = sqlite
    .prepare("SELECT * FROM public_participant_profiles WHERE entity_id = ? AND entity_type = ?")
    .get(entityId, entityType) as any;
  return row ? mapProfile(row) : null;
}

export function findProfileBySlug(entityType: PublicEntityType, slug: string) {
  const sqlite = getPublicSitesDatabase();
  const row = sqlite
    .prepare("SELECT * FROM public_participant_profiles WHERE entity_type = ? AND slug = ?")
    .get(entityType, slug) as any;
  return row ? mapProfile(row) : null;
}

export function upsertProfile(input: UpsertProfileInput) {
  const sqlite = getPublicSitesDatabase();
  const now = nowIso();
  const existing = sqlite
    .prepare("SELECT * FROM public_participant_profiles WHERE entity_id = ? AND entity_type = ?")
    .get(input.entityId, input.entityType) as any;

  if (existing) {
    return mapProfile(existing);
  }

  const clash = sqlite.prepare("SELECT id FROM public_participant_profiles WHERE slug = ?").get(input.desiredSlug) as any;
  if (clash) {
    throw new Error("Slug already in use");
  }

  const id = generateId("pps");
  sqlite
    .prepare(
      `
      INSERT INTO public_participant_profiles (
        id, entity_id, entity_type, slug, approval_status, certification_status, insurance_status,
        verification_badges_json, slug_locked, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    )
    .run(
      id,
      input.entityId,
      input.entityType,
      input.desiredSlug,
      "PENDING",
      "PENDING",
      "PENDING",
      JSON.stringify({ rreVerified: false, complianceVerified: false, insuranceVerified: false }),
      0,
      now,
      now
    );

  const created = sqlite.prepare("SELECT * FROM public_participant_profiles WHERE id = ?").get(id) as any;
  return mapProfile(created);
}

export function updateProfileStatuses(input: UpdateProfileStatusesInput) {
  const sqlite = getPublicSitesDatabase();
  const existing = findProfileById(input.profileId);
  if (!existing) throw new Error("Profile not found");

  const approvalStatus = input.approvalStatus || existing.approvalStatus;
  const certificationStatus = input.certificationStatus || existing.certificationStatus;
  const insuranceStatus = input.insuranceStatus || existing.insuranceStatus;
  const nextBadges = {
    rreVerified: input.verificationBadges?.rreVerified ?? existing.verificationBadges.rreVerified,
    complianceVerified: input.verificationBadges?.complianceVerified ?? existing.verificationBadges.complianceVerified,
    insuranceVerified: input.verificationBadges?.insuranceVerified ?? existing.verificationBadges.insuranceVerified,
  };

  sqlite
    .prepare(
      `
      UPDATE public_participant_profiles
      SET approval_status = ?, certification_status = ?, insurance_status = ?, verification_badges_json = ?, updated_at = ?
      WHERE id = ?
    `
    )
    .run(approvalStatus, certificationStatus, insuranceStatus, JSON.stringify(nextBadges), nowIso(), input.profileId);

  return findProfileById(input.profileId)!;
}

export function updateProfileSlug(profileId: string, desiredSlug: string) {
  const sqlite = getPublicSitesDatabase();
  const existing = findProfileById(profileId);
  if (!existing) throw new Error("Profile not found");
  if (existing.slugLocked) throw new Error("Slug is immutable after first publish");

  const clash = sqlite.prepare("SELECT id FROM public_participant_profiles WHERE slug = ? AND id != ?").get(desiredSlug, profileId) as any;
  if (clash) throw new Error("Slug already in use");

  sqlite.prepare("UPDATE public_participant_profiles SET slug = ?, updated_at = ? WHERE id = ?").run(desiredSlug, nowIso(), profileId);
  return findProfileById(profileId)!;
}

export function lockProfileSlug(profileId: string) {
  const sqlite = getPublicSitesDatabase();
  sqlite.prepare("UPDATE public_participant_profiles SET slug_locked = 1, updated_at = ? WHERE id = ?").run(nowIso(), profileId);
}

export function listSnapshots(entityId?: string, entityType?: PublicEntityType) {
  const sqlite = getPublicSitesDatabase();
  let rows: any[] = [];

  if (entityId && entityType) {
    rows = sqlite
      .prepare(
        "SELECT * FROM public_site_snapshots WHERE entity_id = ? AND entity_type = ? ORDER BY version DESC, updated_at DESC"
      )
      .all(entityId, entityType) as any[];
  } else if (entityId) {
    rows = sqlite
      .prepare("SELECT * FROM public_site_snapshots WHERE entity_id = ? ORDER BY version DESC, updated_at DESC")
      .all(entityId) as any[];
  } else if (entityType) {
    rows = sqlite
      .prepare("SELECT * FROM public_site_snapshots WHERE entity_type = ? ORDER BY entity_id ASC, version DESC")
      .all(entityType) as any[];
  } else {
    rows = sqlite.prepare("SELECT * FROM public_site_snapshots ORDER BY entity_id ASC, version DESC").all() as any[];
  }

  return rows.map(mapSnapshot);
}

export function findSnapshotById(snapshotId: string) {
  const sqlite = getPublicSitesDatabase();
  const row = sqlite.prepare("SELECT * FROM public_site_snapshots WHERE id = ?").get(snapshotId) as any;
  return row ? mapSnapshot(row) : null;
}

export function findDraftSnapshot(entityId: string, entityType: PublicEntityType) {
  const sqlite = getPublicSitesDatabase();
  const row = sqlite
    .prepare(
      "SELECT * FROM public_site_snapshots WHERE entity_id = ? AND entity_type = ? AND status = 'DRAFT' ORDER BY version DESC LIMIT 1"
    )
    .get(entityId, entityType) as any;
  return row ? mapSnapshot(row) : null;
}

export function findLatestSnapshot(entityId: string, entityType: PublicEntityType) {
  const sqlite = getPublicSitesDatabase();
  const row = sqlite
    .prepare("SELECT * FROM public_site_snapshots WHERE entity_id = ? AND entity_type = ? ORDER BY version DESC LIMIT 1")
    .get(entityId, entityType) as any;
  return row ? mapSnapshot(row) : null;
}

export function findPublishedSnapshot(entityId: string, entityType: PublicEntityType) {
  const sqlite = getPublicSitesDatabase();
  const row = sqlite
    .prepare(
      "SELECT * FROM public_site_snapshots WHERE entity_id = ? AND entity_type = ? AND status = 'PUBLISHED' ORDER BY version DESC LIMIT 1"
    )
    .get(entityId, entityType) as any;
  return row ? mapSnapshot(row) : null;
}

export function findPublishedSnapshotByHash(hash: string) {
  const sqlite = getPublicSitesDatabase();
  const row = sqlite
    .prepare("SELECT * FROM public_site_snapshots WHERE rendered_hash = ? AND status = 'PUBLISHED' LIMIT 1")
    .get(hash) as any;
  return row ? mapSnapshot(row) : null;
}

export function createOrUpdateDraft(input: UpsertDraftInput) {
  const sqlite = getPublicSitesDatabase();
  const now = nowIso();
  const profile = findProfileByEntity(input.entityId, input.entityType);
  if (!profile) throw new Error("Profile not found");

  const seoMeta = {
    title: input.seoMeta?.title || "",
    description: input.seoMeta?.description || "",
    ogImageAssetId: input.seoMeta?.ogImageAssetId || "",
    canonicalPath: input.seoMeta?.canonicalPath || "",
  };

  const existingDraft = findDraftSnapshot(input.entityId, input.entityType);
  if (existingDraft) {
    sqlite
      .prepare(
        `
        UPDATE public_site_snapshots
        SET content_json = ?, seo_meta_json = ?, hero_image = ?, logo = ?, updated_at = ?
        WHERE id = ?
      `
      )
      .run(
        JSON.stringify(input.contentJSON),
        JSON.stringify(seoMeta),
        input.heroImage || "",
        input.logo || "",
        now,
        existingDraft.id
      );
    return findSnapshotById(existingDraft.id)!;
  }

  const latest = findLatestSnapshot(input.entityId, input.entityType);
  const nextVersion = latest ? latest.version + 1 : 1;
  const id = generateId("pss");
  sqlite
    .prepare(
      `
      INSERT INTO public_site_snapshots (
        id, entity_id, entity_type, version, status, content_json, rendered_hash,
        published_at, published_by, previous_version_id, seo_meta_json, hero_image, logo,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    )
    .run(
      id,
      input.entityId,
      input.entityType,
      nextVersion,
      "DRAFT",
      JSON.stringify(input.contentJSON),
      null,
      null,
      null,
      latest?.id || null,
      JSON.stringify(seoMeta),
      input.heroImage || "",
      input.logo || "",
      now,
      now
    );
  return findSnapshotById(id)!;
}

export function publishDraft(input: PublishDraftInput) {
  const sqlite = getPublicSitesDatabase();
  const draft = findDraftSnapshot(input.entityId, input.entityType);
  if (!draft) throw new Error("No draft to publish");
  const now = nowIso();

  const transaction = sqlite.transaction(() => {
    sqlite
      .prepare(
        "UPDATE public_site_snapshots SET status = 'SUSPENDED', updated_at = ? WHERE entity_id = ? AND entity_type = ? AND status = 'PUBLISHED'"
      )
      .run(now, input.entityId, input.entityType);

    sqlite
      .prepare(
        `
        UPDATE public_site_snapshots
        SET status = 'PUBLISHED', rendered_hash = ?, published_at = ?, published_by = ?, updated_at = ?
        WHERE id = ?
      `
      )
      .run(input.renderedHash, now, input.adminId, now, draft.id);
  });

  transaction();

  return findSnapshotById(draft.id)!;
}

export function suspendPublished(entityId: string, entityType: PublicEntityType) {
  const sqlite = getPublicSitesDatabase();
  const now = nowIso();
  sqlite
    .prepare(
      "UPDATE public_site_snapshots SET status = 'SUSPENDED', updated_at = ? WHERE entity_id = ? AND entity_type = ? AND status = 'PUBLISHED'"
    )
    .run(now, entityId, entityType);
}

export function listPublishedByEntityType(entityType: PublicEntityType) {
  const sqlite = getPublicSitesDatabase();
  const rows = sqlite
    .prepare(
      `
      SELECT p.*, s.version AS snapshot_version, s.published_at, s.seo_meta_json
      FROM public_participant_profiles p
      JOIN public_site_snapshots s
        ON s.entity_id = p.entity_id
       AND s.entity_type = p.entity_type
       AND s.status = 'PUBLISHED'
      WHERE p.entity_type = ?
      ORDER BY s.published_at DESC
    `
    )
    .all(entityType) as any[];

  return rows.map((row) => ({
    profile: mapProfile(row),
    snapshotVersion: Number(row.snapshot_version),
    publishedAt: row.published_at,
    seoMeta: parseJson(row.seo_meta_json, {}),
  }));
}

export function createContactRequest(input: CreateContactRequestInput) {
  const sqlite = getPublicSitesDatabase();
  const now = nowIso();
  const id = generateId("pcr");
  sqlite
    .prepare(
      `
      INSERT INTO public_contact_requests (
        id, entity_id, entity_type, buyer_id, name, email, message, channel,
        dispatch_status, dispatch_hash, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    )
    .run(
      id,
      input.entityId,
      input.entityType,
      input.buyerId,
      input.name,
      input.email,
      input.message,
      input.channel,
      "PENDING",
      null,
      now,
      now
    );
  return mapContactRequest(sqlite.prepare("SELECT * FROM public_contact_requests WHERE id = ?").get(id));
}

export function updateContactDispatchStatus(contactRequestId: string, status: DispatchStatus, dispatchHash: string) {
  if (!isDispatchStatus(status)) throw new Error("Invalid dispatch status");
  const sqlite = getPublicSitesDatabase();
  sqlite
    .prepare("UPDATE public_contact_requests SET dispatch_status = ?, dispatch_hash = ?, updated_at = ? WHERE id = ?")
    .run(status, dispatchHash, nowIso(), contactRequestId);

  const row = sqlite.prepare("SELECT * FROM public_contact_requests WHERE id = ?").get(contactRequestId) as any;
  return row ? mapContactRequest(row) : null;
}

export function listContactRequests(entityId?: string) {
  const sqlite = getPublicSitesDatabase();
  const rows = entityId
    ? sqlite
        .prepare("SELECT * FROM public_contact_requests WHERE entity_id = ? ORDER BY created_at DESC")
        .all(entityId)
    : sqlite.prepare("SELECT * FROM public_contact_requests ORDER BY created_at DESC").all();
  return rows.map(mapContactRequest);
}

export function createDispatchEvent(entry: {
  eventCode: string;
  refType: string;
  refId: string;
  dispatchHash: string;
}) {
  const sqlite = getPublicSitesDatabase();
  const id = generateId("pde");
  const createdAt = nowIso();
  sqlite
    .prepare(
      "INSERT INTO public_contact_dispatch_events (id, event_code, ref_type, ref_id, dispatch_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(id, entry.eventCode, entry.refType, entry.refId, entry.dispatchHash, createdAt);
  const row = sqlite.prepare("SELECT * FROM public_contact_dispatch_events WHERE id = ?").get(id) as any;
  return mapDispatchEvent(row);
}

export function listDispatchEvents() {
  const sqlite = getPublicSitesDatabase();
  const rows = sqlite
    .prepare("SELECT * FROM public_contact_dispatch_events ORDER BY created_at DESC")
    .all() as any[];
  return rows.map(mapDispatchEvent);
}

export function listPlacementContracts() {
  const sqlite = getPublicSitesDatabase();
  const rows = sqlite.prepare("SELECT * FROM placement_contracts ORDER BY updated_at DESC").all() as any[];
  return rows.map(mapPlacementContract);
}

export function findPlacementContractById(contractId: string) {
  const sqlite = getPublicSitesDatabase();
  const row = sqlite.prepare("SELECT * FROM placement_contracts WHERE id = ?").get(contractId) as any;
  return row ? mapPlacementContract(row) : null;
}

export function createPlacementContract(input: CreatePlacementContractInput) {
  const sqlite = getPublicSitesDatabase();
  const now = nowIso();
  const id = generateId("plc");
  sqlite
    .prepare(
      `
      INSERT INTO placement_contracts (
        id, entity_id, entity_type, tier, weekly_fee_aud, auto_renew, status,
        start_week_id, end_week_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    )
    .run(
      id,
      input.entityId,
      input.entityType,
      input.tier,
      input.weeklyFeeAUD,
      input.autoRenew ? 1 : 0,
      input.status,
      input.startWeekId,
      input.endWeekId,
      now,
      now
    );
  return findPlacementContractById(id)!;
}

export function updatePlacementContract(contractId: string, patch: Partial<CreatePlacementContractInput>) {
  const sqlite = getPublicSitesDatabase();
  const existing = findPlacementContractById(contractId);
  if (!existing) throw new Error("Placement contract not found");

  const next = {
    entityId: patch.entityId || existing.entityId,
    entityType: patch.entityType || existing.entityType,
    tier: patch.tier || existing.tier,
    weeklyFeeAUD: patch.weeklyFeeAUD ?? existing.weeklyFeeAUD,
    autoRenew: patch.autoRenew ?? existing.autoRenew,
    status: patch.status || existing.status,
    startWeekId: patch.startWeekId ?? existing.startWeekId,
    endWeekId: patch.endWeekId ?? existing.endWeekId,
  };

  sqlite
    .prepare(
      `
      UPDATE placement_contracts
      SET entity_id = ?, entity_type = ?, tier = ?, weekly_fee_aud = ?, auto_renew = ?, status = ?,
          start_week_id = ?, end_week_id = ?, updated_at = ?
      WHERE id = ?
    `
    )
    .run(
      next.entityId,
      next.entityType,
      next.tier,
      next.weeklyFeeAUD,
      next.autoRenew ? 1 : 0,
      next.status,
      next.startWeekId,
      next.endWeekId,
      nowIso(),
      contractId
    );

  return findPlacementContractById(contractId)!;
}

export function upsertPlacementLock(input: UpsertPlacementLockInput) {
  const sqlite = getPublicSitesDatabase();
  const now = nowIso();
  const existing = sqlite
    .prepare("SELECT id FROM placement_locks WHERE week_id = ? AND entity_id = ?")
    .get(input.weekId, input.entityId) as any;

  if (existing) {
    sqlite
      .prepare(
        `
        UPDATE placement_locks
        SET entity_type = ?, contract_id = ?, tier = ?, position = ?, snapshot_version = ?,
            lock_hash = ?, locked_at = ?, locked_by = ?, updated_at = ?
        WHERE id = ?
      `
      )
      .run(
        input.entityType,
        input.contractId,
        input.tier,
        input.position,
        input.snapshotVersion,
        input.lockHash,
        input.lockedAt,
        input.lockedBy,
        now,
        existing.id
      );
    const row = sqlite.prepare("SELECT * FROM placement_locks WHERE id = ?").get(existing.id) as any;
    return mapPlacementLock(row);
  }

  const id = generateId("pll");
  sqlite
    .prepare(
      `
      INSERT INTO placement_locks (
        id, week_id, entity_id, entity_type, contract_id, tier, position, snapshot_version,
        lock_hash, locked_at, locked_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    )
    .run(
      id,
      input.weekId,
      input.entityId,
      input.entityType,
      input.contractId,
      input.tier,
      input.position,
      input.snapshotVersion,
      input.lockHash,
      input.lockedAt,
      input.lockedBy,
      now,
      now
    );
  const row = sqlite.prepare("SELECT * FROM placement_locks WHERE id = ?").get(id) as any;
  return mapPlacementLock(row);
}

export function listPlacementLocks(weekId?: string) {
  const sqlite = getPublicSitesDatabase();
  const rows = weekId
    ? sqlite
        .prepare("SELECT * FROM placement_locks WHERE week_id = ? ORDER BY tier ASC, position ASC")
        .all(weekId)
    : sqlite.prepare("SELECT * FROM placement_locks ORDER BY week_id DESC, tier ASC, position ASC").all();
  return rows.map(mapPlacementLock);
}

export function listActivePlacementContracts() {
  const sqlite = getPublicSitesDatabase();
  const rows = sqlite
    .prepare("SELECT * FROM placement_contracts WHERE status = 'ACTIVE' ORDER BY created_at ASC")
    .all() as any[];
  return rows.map(mapPlacementContract);
}

export function clearPlacementLocksForWeek(weekId: string) {
  const sqlite = getPublicSitesDatabase();
  sqlite.prepare("DELETE FROM placement_locks WHERE week_id = ?").run(weekId);
}
