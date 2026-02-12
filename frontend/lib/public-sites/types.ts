export const PublicEntityTypes = ["SUPPLIER", "CERTIFIER", "INSTALLER", "INSURANCE"] as const;
export type PublicEntityType = (typeof PublicEntityTypes)[number];

export const ApprovalStatuses = ["APPROVED", "SUSPENDED", "REVOKED", "PENDING"] as const;
export type ApprovalStatus = (typeof ApprovalStatuses)[number];

export const VerificationStatuses = ["VERIFIED", "EXPIRED", "REVOKED", "NOT_APPLICABLE", "PENDING"] as const;
export type VerificationStatus = (typeof VerificationStatuses)[number];

export const SnapshotStatuses = ["DRAFT", "PUBLISHED", "SUSPENDED"] as const;
export type SnapshotStatus = (typeof SnapshotStatuses)[number];

export const PlacementTiers = ["BASIC", "FEATURED", "SPOTLIGHT"] as const;
export type PlacementTier = (typeof PlacementTiers)[number];

export const PlacementStatuses = ["ACTIVE", "PAUSED", "CANCELLED"] as const;
export type PlacementStatus = (typeof PlacementStatuses)[number];

export const ContactChannels = ["EMAIL", "WECHAT"] as const;
export type ContactChannel = (typeof ContactChannels)[number];

export const DispatchStatuses = ["PENDING", "SENT", "FAILED"] as const;
export type DispatchStatus = (typeof DispatchStatuses)[number];

export type PublicParticipantProfile = {
  id: string;
  entityId: string;
  entityType: PublicEntityType;
  slug: string;
  approvalStatus: ApprovalStatus;
  certificationStatus: VerificationStatus;
  insuranceStatus: VerificationStatus;
  verificationBadges: {
    rreVerified: boolean;
    complianceVerified: boolean;
    insuranceVerified: boolean;
  };
  slugLocked: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PublicSiteSnapshot = {
  id: string;
  entityId: string;
  entityType: PublicEntityType;
  version: number;
  status: SnapshotStatus;
  contentJSON: Record<string, unknown>;
  renderedHash: string | null;
  publishedAt: string | null;
  publishedBy: string | null;
  previousVersionId: string | null;
  seoMeta: {
    title: string;
    description: string;
    ogImageAssetId: string;
    canonicalPath: string;
  };
  heroImage: string;
  logo: string;
  createdAt: string;
  updatedAt: string;
};

export type PublicContactRequest = {
  id: string;
  entityId: string;
  entityType: PublicEntityType;
  buyerId: string | null;
  name: string;
  email: string;
  message: string;
  channel: ContactChannel;
  dispatchStatus: DispatchStatus;
  dispatchHash: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PlacementContract = {
  id: string;
  entityId: string;
  entityType: PublicEntityType;
  tier: PlacementTier;
  weeklyFeeAUD: number;
  autoRenew: boolean;
  status: PlacementStatus;
  startWeekId: string | null;
  endWeekId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PlacementLock = {
  id: string;
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
  createdAt: string;
  updatedAt: string;
};

export type PublicDispatchEvent = {
  id: string;
  eventCode: string;
  refType: string;
  refId: string;
  dispatchHash: string;
  createdAt: string;
};

export type PlacementCapsByTier = Record<PlacementTier, number>;
