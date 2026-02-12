import {
  clearPlacementLocksForWeek,
  createPlacementContract,
  findProfileByEntity,
  findPublishedSnapshot,
  isPlacementStatus,
  isPlacementTier,
  isPublicEntityType,
  listActivePlacementContracts,
  listPlacementContracts,
  listPlacementLocks,
  updatePlacementContract,
  upsertPlacementLock,
} from "../store";
import type { PlacementCapsByTier, PlacementTier, PublicEntityType } from "../types";
import { sha256Hex } from "./hash";
import { shouldAutoUnpublish } from "./PublicSiteService";

function tierRank(tier: PlacementTier) {
  return ["SPOTLIGHT", "FEATURED", "BASIC"].indexOf(tier);
}

function stableSortContracts(
  contracts: Array<{
    id: string;
    entityId: string;
    entityType: PublicEntityType;
    tier: PlacementTier;
    createdAt: string;
    snapshotVersion: number;
  }>
) {
  return [...contracts].sort((a, b) => {
    if (a.tier !== b.tier) return tierRank(a.tier) - tierRank(b.tier);
    const at = new Date(a.createdAt).getTime();
    const bt = new Date(b.createdAt).getTime();
    if (at !== bt) return at - bt;
    return String(a.id).localeCompare(String(b.id));
  });
}

export function lockWeekPlacements(input: {
  weekId: string;
  capsByTier: PlacementCapsByTier;
  adminId: string;
}) {
  const active = listActivePlacementContracts();
  if (!active.length) return { weekId: input.weekId, locked: 0, counters: { BASIC: 0, FEATURED: 0, SPOTLIGHT: 0 } };

  const eligible: Array<{
    id: string;
    entityId: string;
    entityType: PublicEntityType;
    tier: PlacementTier;
    createdAt: string;
    snapshotVersion: number;
  }> = [];

  for (const contract of active) {
    const profile = findProfileByEntity(contract.entityId, contract.entityType);
    if (!profile) continue;
    if (profile.approvalStatus !== "APPROVED") continue;
    if (shouldAutoUnpublish(profile)) continue;

    const published = findPublishedSnapshot(contract.entityId, contract.entityType);
    if (!published) continue;

    eligible.push({
      id: contract.id,
      entityId: contract.entityId,
      entityType: contract.entityType,
      tier: contract.tier,
      createdAt: contract.createdAt,
      snapshotVersion: published.version,
    });
  }

  const sorted = stableSortContracts(eligible);
  const counters: Record<PlacementTier, number> = { BASIC: 0, FEATURED: 0, SPOTLIGHT: 0 };

  clearPlacementLocksForWeek(input.weekId);

  for (const contract of sorted) {
    const cap = input.capsByTier[contract.tier] ?? 0;
    if (counters[contract.tier] >= cap) continue;

    counters[contract.tier] += 1;
    const position = counters[contract.tier];
    const lockPayload = JSON.stringify({
      v: 1,
      weekId: input.weekId,
      entityId: contract.entityId,
      entityType: contract.entityType,
      contractId: contract.id,
      tier: contract.tier,
      position,
      snapshotVersion: contract.snapshotVersion,
    });

    upsertPlacementLock({
      weekId: input.weekId,
      entityId: contract.entityId,
      entityType: contract.entityType,
      contractId: contract.id,
      tier: contract.tier,
      position,
      snapshotVersion: contract.snapshotVersion,
      lockHash: sha256Hex(lockPayload),
      lockedAt: new Date().toISOString(),
      lockedBy: input.adminId,
    });
  }

  const locks = listPlacementLocks(input.weekId);
  return { weekId: input.weekId, locked: locks.length, counters };
}

export function getLocksForWeek(weekId: string) {
  return listPlacementLocks(weekId);
}

export function listContracts() {
  return listPlacementContracts();
}

export function createContract(input: {
  entityId: string;
  entityType: string;
  tier: string;
  weeklyFeeAUD: number;
  autoRenew?: boolean;
  status?: string;
  startWeekId?: string | null;
  endWeekId?: string | null;
}) {
  const entityType = String(input.entityType || "").toUpperCase();
  const tier = String(input.tier || "").toUpperCase();
  const status = String(input.status || "ACTIVE").toUpperCase();

  if (!isPublicEntityType(entityType)) throw new Error("Invalid entityType");
  if (!isPlacementTier(tier)) throw new Error("Invalid tier");
  if (!isPlacementStatus(status)) throw new Error("Invalid status");

  return createPlacementContract({
    entityId: input.entityId,
    entityType,
    tier,
    weeklyFeeAUD: Number(input.weeklyFeeAUD || 0),
    autoRenew: input.autoRenew !== false,
    status,
    startWeekId: input.startWeekId || null,
    endWeekId: input.endWeekId || null,
  });
}

export function updateContract(contractId: string, patch: {
  entityId?: string;
  entityType?: string;
  tier?: string;
  weeklyFeeAUD?: number;
  autoRenew?: boolean;
  status?: string;
  startWeekId?: string | null;
  endWeekId?: string | null;
}) {
  const normalizedPatch: any = { ...patch };
  if (patch.entityType) {
    const entityType = patch.entityType.toUpperCase();
    if (!isPublicEntityType(entityType)) throw new Error("Invalid entityType");
    normalizedPatch.entityType = entityType;
  }
  if (patch.tier) {
    const tier = patch.tier.toUpperCase();
    if (!isPlacementTier(tier)) throw new Error("Invalid tier");
    normalizedPatch.tier = tier;
  }
  if (patch.status) {
    const status = patch.status.toUpperCase();
    if (!isPlacementStatus(status)) throw new Error("Invalid status");
    normalizedPatch.status = status;
  }
  if (patch.weeklyFeeAUD !== undefined) {
    normalizedPatch.weeklyFeeAUD = Number(patch.weeklyFeeAUD);
  }

  return updatePlacementContract(contractId, normalizedPatch);
}

export function resolveCataloguePlacementCards(weekId: string) {
  const locks = listPlacementLocks(weekId);
  return locks
    .map((lock) => {
      const profile = findProfileByEntity(lock.entityId, lock.entityType);
      if (!profile) return null;
      return {
        weekId,
        tier: lock.tier,
        position: lock.position,
        entityType: lock.entityType,
        slug: profile.slug,
        snapshotVersion: lock.snapshotVersion,
        label: "Paid Placement",
        href:
          lock.entityType === "SUPPLIER"
            ? `/suppliers/${profile.slug}`
            : lock.entityType === "INSTALLER"
              ? `/installers/${profile.slug}`
              : lock.entityType === "CERTIFIER"
                ? `/certifiers/${profile.slug}`
                : `/insurance/${profile.slug}`,
      };
    })
    .filter(Boolean);
}
