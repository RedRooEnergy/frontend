import {
  findProfileByEntity,
  findProfileBySlug,
  lockProfileSlug,
  publishDraft as publishDraftInStore,
  suspendPublished,
  upsertProfile,
  updateProfileSlug,
  createOrUpdateDraft,
  findDraftSnapshot,
  findLatestSnapshot,
  findPublishedSnapshot,
  findPublishedSnapshotByHash,
  listPublishedByEntityType,
} from "../store";
import {
  isPublicEntityType as isPublicEntityTypeGuard,
  listProfiles,
  listSnapshots,
  updateProfileStatuses,
} from "../store";
import type { PublicEntityType, PublicParticipantProfile } from "../types";
import { normalizeSlug, assertValidSlug } from "./slug";
import { validateContentJSON } from "./contentSchemas";
import { sha256Hex } from "./hash";

export function deterministicRenderPayload(params: {
  entityType: PublicEntityType;
  slug: string;
  version: number;
  contentJSON: Record<string, unknown>;
  seoMeta?: Record<string, unknown>;
  heroImage?: string;
  logo?: string;
}) {
  return JSON.stringify({
    v: 1,
    entityType: params.entityType,
    slug: params.slug,
    version: params.version,
    seoMeta: params.seoMeta || {},
    heroImage: params.heroImage || "",
    logo: params.logo || "",
    contentJSON: params.contentJSON || {},
  });
}

export function shouldAutoUnpublish(profile: Pick<PublicParticipantProfile, "entityType" | "approvalStatus" | "insuranceStatus" | "certificationStatus">) {
  const badApproval = ["SUSPENDED", "REVOKED"].includes(profile.approvalStatus);
  const badInsurance = ["EXPIRED", "REVOKED"].includes(profile.insuranceStatus);
  const badCert = ["EXPIRED", "REVOKED"].includes(profile.certificationStatus);

  if (profile.entityType === "SUPPLIER") return badApproval || badInsurance || badCert;
  if (profile.entityType === "INSTALLER") return badApproval || badInsurance || badCert;
  if (profile.entityType === "CERTIFIER") return badApproval || badInsurance || badCert;
  if (profile.entityType === "INSURANCE") return badApproval || badInsurance;
  return badApproval;
}

export function getOrCreateProfile(input: { entityId: string; entityType: PublicEntityType; desiredSlug: string }) {
  const existing = findProfileByEntity(input.entityId, input.entityType);
  if (existing) return existing;

  const slug = normalizeSlug(input.desiredSlug);
  assertValidSlug(slug);
  return upsertProfile({ ...input, desiredSlug: slug });
}

export function upsertDraft(input: {
  entityId: string;
  entityType: PublicEntityType;
  userId: string;
  contentJSON: Record<string, unknown>;
  seoMeta?: { title?: string; description?: string; ogImageAssetId?: string; canonicalPath?: string };
  heroImage?: string;
  logo?: string;
  desiredSlug?: string;
}) {
  const profile = findProfileByEntity(input.entityId, input.entityType);
  if (!profile) throw new Error("Profile not found");

  validateContentJSON(input.entityType, input.contentJSON);

  if (input.desiredSlug && !profile.slugLocked) {
    const slug = normalizeSlug(input.desiredSlug);
    assertValidSlug(slug);
    updateProfileSlug(profile.id, slug);
  }

  const draft = createOrUpdateDraft({
    entityId: input.entityId,
    entityType: input.entityType,
    contentJSON: input.contentJSON,
    seoMeta: input.seoMeta,
    heroImage: input.heroImage,
    logo: input.logo,
  });

  return { version: draft.version, status: draft.status };
}

export function publishDraft(input: { entityId: string; entityType: PublicEntityType; adminId: string }) {
  const profile = findProfileByEntity(input.entityId, input.entityType);
  if (!profile) throw new Error("Profile not found");

  if (profile.approvalStatus !== "APPROVED") throw new Error("Entity not approved");
  if (shouldAutoUnpublish(profile)) throw new Error("Entity not eligible for public publishing");

  const draft = findDraftSnapshot(input.entityId, input.entityType);
  if (!draft) throw new Error("No draft to publish");

  const payload = deterministicRenderPayload({
    entityType: input.entityType,
    slug: profile.slug,
    version: draft.version,
    contentJSON: draft.contentJSON,
    seoMeta: draft.seoMeta,
    heroImage: draft.heroImage,
    logo: draft.logo,
  });
  const renderedHash = sha256Hex(payload);

  const published = publishDraftInStore({
    entityId: input.entityId,
    entityType: input.entityType,
    adminId: input.adminId,
    renderedHash,
  });

  if (!profile.slugLocked) {
    lockProfileSlug(profile.id);
  }

  return { version: published.version, renderedHash };
}

export function suspendPublicSite(input: { entityId: string; entityType: PublicEntityType; adminId: string }) {
  suspendPublished(input.entityId, input.entityType);
  return { ok: true };
}

export function getPublishedBySlug(input: { entityType: PublicEntityType; slug: string }) {
  const profile = findProfileBySlug(input.entityType, input.slug);
  if (!profile) return null;

  if (shouldAutoUnpublish(profile)) {
    return { suspended: true, profile };
  }

  const snapshot = findPublishedSnapshot(profile.entityId, profile.entityType);
  if (!snapshot) return null;

  return {
    profile,
    snapshot,
  };
}

export function verifyHash(input: { hash: string }) {
  const snapshot = findPublishedSnapshotByHash(input.hash);
  if (!snapshot) return { status: "INVALID" as const };
  return {
    status: "VALID" as const,
    entityId: snapshot.entityId,
    entityType: snapshot.entityType,
    version: snapshot.version,
    publishedAt: snapshot.publishedAt,
  };
}

export function listPublishedParticipants(entityTypeInput: string) {
  const normalized = String(entityTypeInput || "").trim().toUpperCase();
  if (!isPublicEntityTypeGuard(normalized)) {
    throw new Error("Invalid entityType");
  }

  return listPublishedByEntityType(normalized)
    .filter((entry) => !shouldAutoUnpublish(entry.profile))
    .map((entry) => ({
      entityId: entry.profile.entityId,
      entityType: entry.profile.entityType,
      slug: entry.profile.slug,
      approvalStatus: entry.profile.approvalStatus,
      certificationStatus: entry.profile.certificationStatus,
      insuranceStatus: entry.profile.insuranceStatus,
      badges: entry.profile.verificationBadges,
      snapshotVersion: entry.snapshotVersion,
      publishedAt: entry.publishedAt,
      seoMeta: entry.seoMeta,
    }));
}

export function listAdminProfiles(entityTypeInput?: string) {
  if (!entityTypeInput) return listProfiles();
  const normalized = entityTypeInput.trim().toUpperCase();
  if (!isPublicEntityTypeGuard(normalized)) throw new Error("Invalid entityType");
  return listProfiles(normalized);
}

export function listAdminSnapshots(input: { entityId?: string; entityType?: string }) {
  const normalizedType = input.entityType ? input.entityType.trim().toUpperCase() : undefined;
  if (normalizedType && !isPublicEntityTypeGuard(normalizedType)) {
    throw new Error("Invalid entityType");
  }
  return listSnapshots(input.entityId, normalizedType as PublicEntityType | undefined);
}

export function updateProfileStatus(input: {
  profileId: string;
  approvalStatus?: string;
  certificationStatus?: string;
  insuranceStatus?: string;
  verificationBadges?: {
    rreVerified?: boolean;
    complianceVerified?: boolean;
    insuranceVerified?: boolean;
  };
}) {
  const payload: any = { profileId: input.profileId };
  if (input.approvalStatus) payload.approvalStatus = input.approvalStatus;
  if (input.certificationStatus) payload.certificationStatus = input.certificationStatus;
  if (input.insuranceStatus) payload.insuranceStatus = input.insuranceStatus;
  if (input.verificationBadges) payload.verificationBadges = input.verificationBadges;

  const updated = updateProfileStatuses(payload);
  if (shouldAutoUnpublish(updated)) {
    suspendPublished(updated.entityId, updated.entityType);
  }
  return updated;
}

export function mapEntityPathToType(entityPath: string) {
  const normalized = String(entityPath || "").trim().toUpperCase();
  if (!isPublicEntityTypeGuard(normalized)) throw new Error("Invalid entityType");
  return normalized as PublicEntityType;
}

export function getLatestPublishedSnapshot(entityId: string, entityType: PublicEntityType) {
  return findPublishedSnapshot(entityId, entityType);
}

export function getLatestSnapshot(entityId: string, entityType: PublicEntityType) {
  return findLatestSnapshot(entityId, entityType);
}
