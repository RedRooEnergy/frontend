import { assertNoMoneyFields } from "./servicePartner/noMoneyGuard";
import type { ComplianceWorkflowState } from "./compliance/workflowStateMachine";
import { recordAudit } from "./audit";

type StoreKey =
  | "session"
  | "supplierProducts"
  | "supplierProductRecords"
  | "cart"
  | "wishlist"
  | "orders"
  | "adminFlags"
  | "buyers"
  | "userContacts"
  | "authAttempts"
  | "returns"
  | "warranties"
  | "documents"
  | "tickets"
  | "notifications"
  | "servicePartnerTasks"
  | "servicePartnerDocuments"
  | "servicePartnerComplianceProfiles"
  | "servicePartnerInterestSignals"
  | "freightDocuments"
  | "freightExceptions"
  | "userAccessOverrides"
  | "processedWebhookEvents"
  | "supplierProfiles"
  | "supplierProductStates"
  | "shipmentUpdates"
  | "adminDisputes"
  | "adminAuditLogs"
  | "complianceDecisions"
  | "adminExports"
  | "supplierCompanyProfiles"
  | "supplierComplianceProfiles"
  | "ext02Records"
  | "ext03Records"
  | "ext04Records"
  | "ext05Records";

const STORAGE_PREFIX = "rre-v1:";

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

type ServerStoreMap = Map<string, string>;
const globalForStore = globalThis as typeof globalThis & { __rreServerStore?: ServerStoreMap };

function getServerStore(): ServerStoreMap | null {
  if (typeof window !== "undefined") return null;
  if (!globalForStore.__rreServerStore) {
    globalForStore.__rreServerStore = new Map<string, string>();
  }
  return globalForStore.__rreServerStore;
}

export function readStore<T>(key: StoreKey, fallback: T): T {
  const storage = getStorage();
  const raw = storage
    ? storage.getItem(STORAGE_PREFIX + key)
    : getServerStore()?.get(STORAGE_PREFIX + key) ?? null;
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function installerAttributionChanged(prev?: InstallerAttribution, next?: InstallerAttribution) {
  if (!prev && !next) return false;
  if (!prev || !next) return true;
  return (
    prev.installerId !== next.installerId ||
    prev.source !== next.source ||
    prev.assignedAt !== next.assignedAt
  );
}

function hasImmutableInstallerViolation(existing: OrderRecord[], next: OrderRecord[]) {
  const lockedStatuses: OrderStatus[] = [
    "PAID",
    "PAYMENT_REVIEW_REQUIRED",
    "SETTLEMENT_ELIGIBLE",
    "SETTLED",
    "REFUND_REQUESTED",
    "REFUNDED",
  ];
  return existing.some((prev) => {
    if (!lockedStatuses.includes(prev.status as OrderStatus)) return false;
    const nextOrder = next.find((o) => o.orderId === prev.orderId);
    if (!nextOrder) return false;
    return installerAttributionChanged(prev.installerAttribution, nextOrder.installerAttribution);
  });
}

export function writeStore<T>(key: StoreKey, value: T) {
  const storage = getStorage();
  const serverStore = storage ? null : getServerStore();
  if (key === "orders") {
    const existing = readStore<OrderRecord[]>("orders", []);
    const next = Array.isArray(value) ? (value as OrderRecord[]) : [];
    if (hasImmutableInstallerViolation(existing, next)) {
      recordAudit("INSTALLER_ATTRIBUTION_CHANGE_BLOCKED", {
        reason: "Installer attribution is immutable after payment.",
      });
      return;
    }
  }
  const payload = JSON.stringify(value);
  if (storage) {
    storage.setItem(STORAGE_PREFIX + key, payload);
    return;
  }
  if (serverStore) {
    serverStore.set(STORAGE_PREFIX + key, payload);
  }
}

// Session helpers
export interface SessionState {
  role: "buyer" | "supplier" | "service-partner" | "freight" | "regulator" | "admin";
  userId: string;
  email: string;
}

export function getSession(): SessionState | null {
  return readStore<SessionState | null>("session", null);
}

export function setSession(session: SessionState | null) {
  if (!session) return writeStore("session", null as any);
  return writeStore("session", session);
}

// Wish list
export interface WishlistItem {
  productSlug: string;
  name: string;
  price: number;
  originalPrice?: number;
  image?: string;
  supplierName?: string;
  addedAt: string;
}

export function getWishlist(): WishlistItem[] {
  return readStore<WishlistItem[]>("wishlist", []);
}

export function setWishlist(items: WishlistItem[]) {
  writeStore("wishlist", items);
}

export function addToWishlist(item: Omit<WishlistItem, "addedAt">) {
  const list = getWishlist();
  if (list.some((entry) => entry.productSlug === item.productSlug)) return list;
  const next = [{ ...item, addedAt: new Date().toISOString() }, ...list];
  setWishlist(next);
  return next;
}

export function removeFromWishlist(productSlug: string) {
  const next = getWishlist().filter((entry) => entry.productSlug !== productSlug);
  setWishlist(next);
  return next;
}

export function clearWishlist() {
  setWishlist([]);
}

// Supplier product overrides
export interface SupplierProductOverride {
  productSlug: string;
  supplierId: string;
  price?: number;
  originalPrice?: number;
  complianceFlags?: string[];
  attributes?: Record<string, string | number | boolean>;
  weeklyDeal?: {
    nominated: boolean;
    weekStart: string;
    weekEnd: string;
  };
  wiseProfileId?: string;
  wiseRecipientAccountId?: string;
  payoutCurrency?: string;
}

// Supplier profiles and capabilities
export type PaymentRail = "stripe" | "wise" | "airwallex" | "swift";

export interface SupplierProfile {
  supplierId: string;
  kybLegalName: string;
  beneficiaryName: string;
  paymentRails: PaymentRail[];
  payoutCurrencies: string[];
  fullPrepaymentRequired: boolean;
  fullPrepaymentOverrideApprovalId?: string;
  kybStatus: "pending" | "verified" | "rejected";
  preferredLanguage?: "en" | "zh-CN";
  createdAt: string;
  updatedAt: string;
}

export type SupplierOnboardingStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED";

export interface SupplierPhoneNumber {
  countryCode: string;
  number: string;
}

export interface SupplierAddress {
  line1: string;
  line2?: string;
  city: string;
  region: string;
  postalCode: string;
  country: "CN" | "AU";
}

export interface SupplierRepresentative {
  fullName: string;
  title: string;
  nationality?: string;
  email: string;
  mobile: SupplierPhoneNumber;
  messagingApps?: string[];
  authorityDocumentId?: string;
  authorityDeclarationAccepted?: boolean;
  authorityDeclaredAt?: string;
}

export interface SupplierFactory {
  name?: string;
  country: "CN";
  city?: string;
  address?: string;
  ownershipType?: "OWNED" | "LEASED" | "THIRD_PARTY";
  capacityAnnualRange?: string;
  qualitySystemsDeclared?: string[];
  lastExternalAuditDate?: string;
  auditReportDocumentId?: string;
}

export interface SupplierCompanyProfile {
  supplierId: string;
  identity: {
    legalNameNative: string;
    legalNameEnglish: string;
    tradingName?: string;
    brandName?: string;
    countryOfIncorporation: "CN";
    legalStructure: string;
    registrationNumber: string;
    incorporationDate?: string;
    registeredAddress: SupplierAddress;
    operatingAddress?: SupplierAddress;
    websiteUrl?: string;
    officialEmailDomain?: string;
    logoAssetId?: string;
    descriptionShort?: string;
    yearsInOperationRange?: string;
    employeeCountRange?: string;
  };
  contacts: {
    primaryEmail: string;
    primaryMobile: SupplierPhoneNumber;
    preferredLanguage: "en" | "zh-CN";
    timeZone: string;
  };
  representatives: {
    authorisedRepresentatives: SupplierRepresentative[];
  };
  capability: {
    supplierType?: "MANUFACTURER" | "OEM" | "ODM" | "TRADING_COMPANY" | "FACTORY_GROUP";
    manufacturingModel?: "OWN_FACTORY" | "SUBCONTRACTED" | "MIXED";
    factories: SupplierFactory[];
    intendedCategoryIds: string[];
    preferredCompliancePartnerIds: string[];
    oemOdmConfirmed: boolean;
    privateLabelSupported: boolean;
  };
  commercial: {
    acceptedZeroCommission: boolean;
    acceptedServiceFeeStructure: boolean;
    supportedCurrencies: Array<"CNY" | "AUD">;
    defaultMoq?: number;
    productionLeadTimeDays?: number;
    dispatchReadyLeadTimeDays?: number;
  };
  logistics: {
    incotermsSupported: Array<"DDP">;
    exporterOfRecord?: "SUPPLIER" | "AGENT" | "UNKNOWN";
    preferredFreightModes: Array<"SEA" | "AIR" | "HYBRID">;
    portOfDeparture?: string;
    dangerousGoodsDeclared: boolean;
    batteryHandlingAcknowledged: boolean;
    insuranceAcknowledged: boolean;
    proofOfDeliveryAcknowledged: boolean;
  };
  payments: {
    settlementMethod?: "STRIPE_CONNECT" | "WISE" | "BANK_TRANSFER";
    settlementCurrency?: "CNY" | "AUD";
    bankCountry?: "CN" | "AU";
    beneficiaryLegalName?: string;
    bankDetailsRefId?: string;
    bankVerificationDocumentId?: string;
    bankVerified?: boolean;
    bankVerifiedAt?: string;
    bankVerifiedByAdminId?: string;
  };
  declarations: {
    supplierAgreementAccepted: boolean;
    complianceTruthDeclared: boolean;
    antiBriberyDeclared: boolean;
    sanctionsDeclared: boolean;
    productLiabilityDeclared: boolean;
    auditConsentGranted: boolean;
    privacyAccepted: boolean;
    jurisdictionAccepted: boolean;
    acceptedAt?: string;
    acceptedFromIp?: string;
    acceptedUserAgent?: string;
  };
  governance: {
    status: SupplierOnboardingStatus;
    locked: boolean;
    submittedAt?: string;
    submittedByRepresentativeName?: string;
    riskTier?: "LOW" | "MEDIUM" | "HIGH";
    assignedReviewerId?: string;
    lastAdminActionAt?: string;
    approvedCategories?: string[];
    restrictedCategories?: string[];
    decision?: {
      decisionType?: "APPROVE" | "REJECT" | "SUSPEND" | "REQUEST_CHANGES";
      reasonCodes?: string[];
      notes?: string;
      decidedAt?: string;
      decidedByAdminId?: string;
    };
    unlockPlan?: {
      unlockedSections?: string[];
      unlockedAt?: string;
      unlockedByAdminId?: string;
      unlockNotes?: string;
    };
  };
  auditMeta: {
    schemaVersion?: string;
    profileHash?: string;
    lastSnapshotId?: string;
    createdAt: string;
    updatedAt: string;
    updatedByRole?: "SUPPLIER" | "ADMIN" | "SYSTEM";
    updatedById?: string;
  };
}

export interface SupplierCertificationRecord {
  id: string;
  type: "CEC" | "RCM" | "EESS" | "GEMS" | "IEC" | "ISO" | "UN38_3";
  holderLegalName: string;
  certificateNumber: string;
  issuingAuthority: string;
  issueDate: string;
  expiryDate: string;
  scopeModels: string[];
  certificateDocumentId: string;
  translationDocumentId?: string;
  verificationStatus: "PENDING" | "VERIFIED" | "EXPIRED" | "REJECTED" | "NEEDS_TRANSLATION";
  verificationNotes?: string;
  verifiedAt?: string;
  verifiedByAdminId?: string;
  rejectionReasonCodes?: string[];
}

export interface SupplierCategoryCompliance {
  categoryId: string;
  batteryComplianceRequired: boolean;
  electricalSafetyRequired: boolean;
  energyEfficiencyRequired: boolean;
  categoryStatus: "NOT_READY" | "UNDER_REVIEW" | "VERIFIED" | "REJECTED" | "SUSPENDED";
  decisionNotes?: string;
  decidedAt?: string;
  decidedByAdminId?: string;
}

export interface SupplierComplianceProfile {
  supplierId: string;
  categoryIds: string[];
  certifications: SupplierCertificationRecord[];
  categoryCompliance: SupplierCategoryCompliance[];
  regulatorVisibility: {
    visible: boolean;
    scopePolicyId: string;
  };
  auditMeta: {
    schemaVersion?: string;
    profileHash?: string;
    lastSnapshotId?: string;
    createdAt: string;
    updatedAt: string;
    updatedByRole?: "SUPPLIER" | "ADMIN" | "SYSTEM";
    updatedById?: string;
  };
}

export function getSupplierProfiles(): SupplierProfile[] {
  return readStore<SupplierProfile[]>("supplierProfiles", []);
}

export function setSupplierProfiles(profiles: SupplierProfile[]) {
  writeStore("supplierProfiles", profiles);
}

export function upsertSupplierProfile(profile: SupplierProfile) {
  const profiles = getSupplierProfiles();
  const idx = profiles.findIndex((p) => p.supplierId === profile.supplierId);
  if (idx === -1) profiles.push(profile);
  else profiles[idx] = profile;
  writeStore("supplierProfiles", profiles);
}

export function getSupplierCompanyProfiles(): SupplierCompanyProfile[] {
  return readStore<SupplierCompanyProfile[]>("supplierCompanyProfiles", []);
}

export function setSupplierCompanyProfiles(profiles: SupplierCompanyProfile[]) {
  writeStore("supplierCompanyProfiles", profiles);
}

export function getSupplierCompanyProfile(supplierId: string): SupplierCompanyProfile {
  const profiles = getSupplierCompanyProfiles();
  const existing = profiles.find((p) => p.supplierId === supplierId);
  if (existing) return existing;
  const now = new Date().toISOString();
  const blankAddress: SupplierAddress = {
    line1: "",
    city: "",
    region: "",
    postalCode: "",
    country: "CN",
  };
  const profile: SupplierCompanyProfile = {
    supplierId,
    identity: {
      legalNameNative: "",
      legalNameEnglish: "",
      tradingName: "",
      brandName: "",
      countryOfIncorporation: "CN",
      legalStructure: "",
      registrationNumber: "",
      incorporationDate: "",
      registeredAddress: { ...blankAddress },
      operatingAddress: { ...blankAddress },
      websiteUrl: "",
      officialEmailDomain: "",
      logoAssetId: "",
      descriptionShort: "",
      yearsInOperationRange: "UNKNOWN",
      employeeCountRange: "UNKNOWN",
    },
    contacts: {
      primaryEmail: "",
      primaryMobile: { countryCode: "+86", number: "" },
      preferredLanguage: "en",
      timeZone: "Australia/Brisbane",
    },
    representatives: {
      authorisedRepresentatives: [],
    },
    capability: {
      supplierType: undefined,
      manufacturingModel: undefined,
      factories: [],
      intendedCategoryIds: [],
      preferredCompliancePartnerIds: [],
      oemOdmConfirmed: false,
      privateLabelSupported: false,
    },
    commercial: {
      acceptedZeroCommission: false,
      acceptedServiceFeeStructure: false,
      supportedCurrencies: ["CNY", "AUD"],
      defaultMoq: undefined,
      productionLeadTimeDays: undefined,
      dispatchReadyLeadTimeDays: undefined,
    },
    logistics: {
      incotermsSupported: ["DDP"],
      exporterOfRecord: "UNKNOWN",
      preferredFreightModes: [],
      portOfDeparture: "",
      dangerousGoodsDeclared: false,
      batteryHandlingAcknowledged: false,
      insuranceAcknowledged: false,
      proofOfDeliveryAcknowledged: false,
    },
    payments: {
      settlementMethod: undefined,
      settlementCurrency: undefined,
      bankCountry: undefined,
      beneficiaryLegalName: "",
      bankDetailsRefId: "",
      bankVerificationDocumentId: "",
      bankVerified: false,
    },
    declarations: {
      supplierAgreementAccepted: false,
      complianceTruthDeclared: false,
      antiBriberyDeclared: false,
      sanctionsDeclared: false,
      productLiabilityDeclared: false,
      auditConsentGranted: false,
      privacyAccepted: false,
      jurisdictionAccepted: false,
    },
    governance: {
      status: "DRAFT",
      locked: false,
    },
    auditMeta: {
      schemaVersion: "1.0.0",
      createdAt: now,
      updatedAt: now,
      updatedByRole: "SUPPLIER",
    },
  };
  profiles.push(profile);
  setSupplierCompanyProfiles(profiles);
  return profile;
}

export function upsertSupplierCompanyProfile(profile: SupplierCompanyProfile) {
  const profiles = getSupplierCompanyProfiles();
  const idx = profiles.findIndex((p) => p.supplierId === profile.supplierId);
  if (idx === -1) profiles.push(profile);
  else profiles[idx] = profile;
  writeStore("supplierCompanyProfiles", profiles);
}

export function getSupplierComplianceProfiles(): SupplierComplianceProfile[] {
  return readStore<SupplierComplianceProfile[]>("supplierComplianceProfiles", []);
}

export function setSupplierComplianceProfiles(profiles: SupplierComplianceProfile[]) {
  writeStore("supplierComplianceProfiles", profiles);
}

export function getSupplierComplianceProfile(supplierId: string): SupplierComplianceProfile {
  const profiles = getSupplierComplianceProfiles();
  const existing = profiles.find((p) => p.supplierId === supplierId);
  if (existing) return existing;
  const now = new Date().toISOString();
  const profile: SupplierComplianceProfile = {
    supplierId,
    categoryIds: [],
    certifications: [],
    categoryCompliance: [],
    regulatorVisibility: {
      visible: true,
      scopePolicyId: "REG-SCOPE-SUPPLIER-COMPLIANCE-READONLY-v1",
    },
    auditMeta: {
      schemaVersion: "1.0.0",
      createdAt: now,
      updatedAt: now,
      updatedByRole: "SUPPLIER",
    },
  };
  profiles.push(profile);
  setSupplierComplianceProfiles(profiles);
  return profile;
}

export function upsertSupplierComplianceProfile(profile: SupplierComplianceProfile) {
  const profiles = getSupplierComplianceProfiles();
  const idx = profiles.findIndex((p) => p.supplierId === profile.supplierId);
  if (idx === -1) profiles.push(profile);
  else profiles[idx] = profile;
  writeStore("supplierComplianceProfiles", profiles);
}

// Supplier product state machine
export type ProductState =
  | "SUBMITTED"
  | "REVIEW"
  | "APPROVED"
  | "LISTED"
  | "SALE"
  | "FULFILMENT"
  | "DELIVERED"
  | "RETURN_WINDOW"
  | "SETTLEMENT_ELIGIBLE"
  | "SETTLED";

export interface SupplierProductState {
  productSlug: string;
  supplierId: string;
  state: ProductState;
  certificationsProvided: boolean;
  pricingSnapshotCaptured: boolean;
  notes?: string;
  updatedAt: string;
}

export function getSupplierProductStates(): SupplierProductState[] {
  return readStore<SupplierProductState[]>("supplierProductStates", []);
}

export function setSupplierProductStates(states: SupplierProductState[]) {
  writeStore("supplierProductStates", states);
}

export function updateSupplierProductState(productSlug: string, supplierId: string, updates: Partial<SupplierProductState>) {
  const states = getSupplierProductStates();
  const idx = states.findIndex((s) => s.productSlug === productSlug && s.supplierId === supplierId);
  if (idx === -1) return;
  states[idx] = { ...states[idx], ...updates, updatedAt: new Date().toISOString() };
  setSupplierProductStates(states);
}

// Shipment updates
export type ShipmentMilestone = "PICKUP" | "EXPORT_CLEARANCE" | "IN_TRANSIT" | "DELIVERED";

export interface ShipmentUpdate {
  id: string;
  supplierId: string;
  productSlug: string;
  milestone: ShipmentMilestone;
  trackingId?: string;
  evidenceNote?: string;
  timestamp: string;
}

export function getShipmentUpdates(): ShipmentUpdate[] {
  return readStore<ShipmentUpdate[]>("shipmentUpdates", []);
}

export function setShipmentUpdates(updates: ShipmentUpdate[]) {
  writeStore("shipmentUpdates", updates);
}

// Buyers
export interface BuyerRecord {
  buyerId: string;
  email: string;
  name: string;
  phone?: string;
  phoneCountryCode?: string;
  phoneNumber?: string;
  createdAt: string;
  password?: string;
  buyerType?: "Individual" | "SME" | "Enterprise" | "Government";
  businessVerified?: boolean;
  savedProjects?: string[];
  notificationPrefs?: {
    orderUpdates: boolean;
    documentUpdates: boolean;
    complianceAlerts: boolean;
  };
}

export function getBuyers(): BuyerRecord[] {
  return readStore<BuyerRecord[]>("buyers" as StoreKey, []);
}

export function addBuyer(buyer: BuyerRecord) {
  const buyers = getBuyers();
  buyers.push(buyer);
  writeStore("buyers" as StoreKey, buyers);
}

export function updateBuyer(email: string, updates: Partial<BuyerRecord>) {
  const buyers = getBuyers();
  const idx = buyers.findIndex((b) => b.email === email);
  if (idx === -1) return;
  buyers[idx] = { ...buyers[idx], ...updates };
  writeStore("buyers" as StoreKey, buyers);
}

export function getSupplierOverrides(): SupplierProductOverride[] {
  return readStore<SupplierProductOverride[]>("supplierProducts", []);
}

export function setSupplierOverrides(overrides: SupplierProductOverride[]) {
  writeStore("supplierProducts", overrides);
}

// Supplier product records (drafts + approvals)
export type SupplierProductStatus = "DRAFT" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "SUSPENDED";

export type PartnerReviewStatus = "not_started" | "pending" | "pass" | "fail";

export interface CertificationRecord {
  fileName?: string;
  certificateNumber?: string;
  issuingBody?: string;
  expiryDate?: string;
}

export interface SupplierProductRecord {
  id: string;
  supplierId: string;
  status: SupplierProductStatus;
  name: string;
  categorySlug?: string;
  subCategorySlug?: string;
  attributes: Record<string, string | number | boolean>;
  imageFiles: string[];
  certifications: {
    cec?: CertificationRecord;
    rcm?: CertificationRecord;
    gems?: CertificationRecord;
    structural?: CertificationRecord;
  };
  certifierOfRecord?: string;
  certificationFeeBase?: number;
  certificationFeeCurrency?: "AUD" | "NZD";
  complianceWorkflowStatus?: "PENDING" | "CERTIFIED" | "FAILED";
  complianceWorkflowState?: ComplianceWorkflowState;
  compliancePartnerId?: string;
  supplierApprovalSigned?: boolean;
  supplierApprovalName?: string;
  supplierApprovalAt?: string;
  partnerReviewStatus?: PartnerReviewStatus;
  partnerReviewRequestedAt?: string;
  partnerReviewReport?: CertificationRecord;
  completeness: number;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export function getSupplierProductRecords(): SupplierProductRecord[] {
  return readStore<SupplierProductRecord[]>("supplierProductRecords", []);
}

export function setSupplierProductRecords(records: SupplierProductRecord[]) {
  writeStore("supplierProductRecords", records);
}

export function upsertSupplierProductRecord(record: SupplierProductRecord) {
  const records = getSupplierProductRecords();
  const idx = records.findIndex((r) => r.id === record.id);
  if (idx === -1) records.push(record);
  else records[idx] = record;
  setSupplierProductRecords(records);
}

export function removeSupplierProductRecord(id: string) {
  const next = getSupplierProductRecords().filter((record) => record.id !== id);
  setSupplierProductRecords(next);
}

// Cart and orders
export interface CartItem {
  productSlug: string;
  name: string;
  qty: number;
  price: number;
  supplierId?: string;
}

export interface InstallerAttribution {
  installerId: string;
  source: "RRE_INSTALLER_CHANNEL";
  assignedAt: string;
}

export interface OrderRecord {
  orderId: string;
  createdAt: string;
  buyerEmail: string;
  shippingAddress: Record<string, string>;
  deliveryNotes?: string;
  items: CartItem[];
  total: number;
  status: OrderStatus | "CANCELLED" | "PAYMENT_INITIATED" | "PAYMENT_REVIEW_REQUIRED";
  supplierIds?: string[];
  timeline?: OrderTimelineEvent[];
  deliveredAt?: string;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  currency?: string;
  escrowStatus?: "HELD" | "RELEASED" | "SETTLED";
  pricingSnapshotHash?: string;
  refundId?: string;
  installerAttribution?: InstallerAttribution;
}

export type OrderStatus =
  | "PENDING"
  | "CANCELLED"
  | "PAYMENT_INITIATED"
  | "PAID"
  | "PAYMENT_REVIEW_REQUIRED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "SETTLEMENT_ELIGIBLE"
  | "SETTLED"
  | "REFUND_REQUESTED"
  | "REFUNDED";

export interface OrderTimelineEvent {
  status: OrderStatus;
  timestamp: string;
  note?: string;
}

// Returns
export type ReturnStatus = "REQUESTED" | "APPROVED" | "REJECTED" | "IN_TRANSIT" | "REFUNDED";

export interface ReturnTimelineEvent {
  status: ReturnStatus;
  timestamp: string;
  note?: string;
}

export interface ReturnRequest {
  rmaId: string;
  orderId: string;
  buyerEmail: string;
  productSlug: string;
  productName: string;
  reason: string;
  status: ReturnStatus;
  createdAt: string;
  updatedAt: string;
  timeline: ReturnTimelineEvent[];
}

// Warranties
export type WarrantyStatus =
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "INFO_REQUIRED"
  | "APPROVED"
  | "REJECTED"
  | "RESOLVED";

export interface WarrantyTimelineEvent {
  status: WarrantyStatus;
  timestamp: string;
  note?: string;
}

export interface WarrantyClaim {
  claimId: string;
  orderId: string;
  buyerEmail: string;
  productSlug: string;
  productName: string;
  issue: string;
  installerReference?: string;
  installDate?: string;
  status: WarrantyStatus;
  createdAt: string;
  updatedAt: string;
  timeline: WarrantyTimelineEvent[];
}

// Documents
export type DocumentType = "ORDER_CONFIRMATION" | "INVOICE" | "SHIPPING" | "COMPLIANCE";

export interface BuyerDocument {
  documentId: string;
  orderId: string;
  buyerEmail: string;
  type: DocumentType;
  name: string;
  createdAt: string;
  downloadUrl?: string; // placeholder/local
}

// Support tickets
export type TicketCategory = "ORDER_ISSUE" | "DELIVERY_ISSUE" | "REFUND_RETURN" | "WARRANTY" | "GENERAL";
export type TicketStatus = "OPEN" | "IN_REVIEW" | "RESOLVED";

export interface SupportTicket {
  ticketId: string;
  buyerEmail: string;
  subject: string;
  message: string;
  category: TicketCategory;
  orderId?: string;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
}

// Negotiated/commercial orders
export type NegotiatedOrderStatus = "REQUESTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";

export interface NegotiatedOrderRequest {
  requestId: string;
  buyerEmail: string;
  companyName?: string;
  projectName: string;
  estimatedValue?: string;
  notes?: string;
  status: NegotiatedOrderStatus;
  createdAt: string;
  updatedAt: string;
}

// User contact profiles for non-buyer roles
export interface UserContactProfile {
  role: SessionState["role"];
  email: string;
  phone?: string;
  phoneCountryCode?: string;
  phoneNumber?: string;
  updatedAt: string;
}

export type AccessStatus = "ACTIVE" | "SUSPENDED" | "REVIEW";
export interface UserAccessOverride {
  id: string;
  role: SessionState["role"];
  email: string;
  status: AccessStatus;
  reason?: string;
  updatedAt: string;
}

// Auth attempts
export type AuthAttemptType = "SIGN_IN" | "SIGN_UP" | "FORGOT_PASSWORD";
export type AuthAttemptStatus = "REQUESTED" | "SUCCESS" | "FAILED";

export interface AuthAttemptRecord {
  id: string;
  type: AuthAttemptType;
  status: AuthAttemptStatus;
  role?: SessionState["role"];
  email?: string;
  phone?: string;
  step?: string;
  error?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

// Service partner tasks
export type ServicePartnerTaskStatus = "ASSIGNED" | "SCHEDULED" | "IN_PROGRESS" | "EVIDENCE_REQUIRED" | "COMPLETED";
export type ServicePartnerTaskType = "INSTALLATION" | "COMPLIANCE_CHECK" | "DELIVERY_SUPPORT" | "INSPECTION";

export interface ServicePartnerTask {
  taskId: string;
  servicePartnerId: string;
  orderId?: string;
  taskType: ServicePartnerTaskType;
  title: string;
  status: ServicePartnerTaskStatus;
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  priority?: "High" | "Medium" | "Low";
  slaHours?: number;
  location?: string;
  checklist?: string[];
  evidenceRequired?: string[];
}

export type ServicePartnerComplianceStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "CHANGES_REQUIRED"
  | "APPROVED"
  | "ACTIVE"
  | "RESTRICTED"
  | "SUSPENDED"
  | "REVOKED"
  | "EXPIRED";

export interface ServicePartnerComplianceProfile {
  partnerId: string;
  status: ServicePartnerComplianceStatus;
  updatedAt: string;
  changeRequestNote?: string;
  changeRequestedAt?: string;
  unlockedSections?: string[];
  adminReviewNotes?: string;
  identity: {
    legalName: string;
    tradingName?: string;
    businessType: string;
    registrationNumber: string;
    country: string;
    address: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    jurisdictions: string;
  };
  accreditation: {
    body: string;
    licenceNumber: string;
    certificationTypes: string[];
    standards: string;
    issueDate: string;
    expiryDate: string;
    scopeLimitations: string;
    accreditationCertFile: string;
    scopeDocFile: string;
    regulatorLetterFile: string;
  };
  capabilities: {
    canIssueCertificates: boolean;
    canInspect: boolean;
    canReviewReports: boolean;
    canReject: boolean;
    canConditionalApprove: boolean;
    canMandateRemediation: boolean;
    remoteInspections: boolean;
    remoteMethodology: string;
    turnaroundDays: string;
  };
  personnel: {
    responsibleOfficer: string;
    technicalLead: string;
    inspectorCount: string;
    licenceNumbers: string;
    licenceExpiries: string;
    licenceFiles: string[];
  };
  conflicts: {
    declarations: {
      independentSuppliers: boolean;
      noFinancialInterest: boolean;
      noOwnershipLinks: boolean;
      acceptAuditAccess: boolean;
      acknowledgePenalties: boolean;
    };
    conflictDisclosure: string;
  };
  methodology: {
    inspectionSummary: string;
    issuanceWorkflow: string;
    retentionYears: string;
    complaintHandling: string;
    processManualFile: string;
    checklistFile: string;
    sampleCertificateFile: string;
  };
  insurance: {
    insurer: string;
    policyNumber: string;
    coverageAmount: string;
    expiryDate: string;
    certificateFile: string;
  };
  security: {
    documentHandling: boolean;
    dataProtection: boolean;
    breachProcess: boolean;
    iso27001: boolean;
  };
  declarations: {
    accuracyConfirmed: boolean;
    agreementAccepted: boolean;
    auditAccessAccepted: boolean;
    installerServicePartnerTermsAccepted?: boolean;
    installerServicePartnerTermsAcceptedAt?: string;
    signatoryName: string;
    signatoryTitle: string;
    signatureDate: string;
    signature: string;
  };
}

export interface ServicePartnerInterestSignal {
  id: string;
  partnerId: string;
  needId: string;
  interestLevel: "READY_NOW" | "AVAILABLE_SOON" | "NOT_AVAILABLE";
  capacityPerWeek?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Admin disputes
export type DisputeStatus = "OPEN" | "IN_REVIEW" | "RESOLVED";

export interface AdminDispute {
  id: string;
  orderId: string;
  status: DisputeStatus;
  reason: string;
  evidence?: string;
  resolution?: string;
  updatedAt: string;
}

export interface AdminAuditLog {
  id: string;
  actorId: string;
  actorRole: SessionState["role"];
  action: string;
  targetType: string;
  targetId: string;
  reasonCode?: string;
  notes?: string;
  metadata?: Record<string, string | number | boolean>;
  createdAt: string;
}

export function getAdminDisputes(): AdminDispute[] {
  return readStore<AdminDispute[]>("adminDisputes", []);
}

export function setAdminDisputes(disputes: AdminDispute[]) {
  writeStore("adminDisputes", disputes);
}

export function getAdminAuditLogs(): AdminAuditLog[] {
  return readStore<AdminAuditLog[]>("adminAuditLogs", []);
}

export function addAdminAuditLog(log: AdminAuditLog) {
  const logs = getAdminAuditLogs();
  logs.unshift(log);
  writeStore("adminAuditLogs", logs);
}

// Compliance decisions
export type ComplianceDecisionStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface ComplianceDecision {
  id: string;
  orderId: string;
  productSlug?: string;
  status: ComplianceDecisionStatus;
  rationale?: string;
  approver?: string;
  updatedAt: string;
}

export function getComplianceDecisions(): ComplianceDecision[] {
  return readStore<ComplianceDecision[]>("complianceDecisions", []);
}

export function setComplianceDecisions(decisions: ComplianceDecision[]) {
  writeStore("complianceDecisions", decisions);
}

// Admin exports
export interface AdminExportRecord {
  id: string;
  type: string;
  createdAt: string;
  hash: string;
  requester?: string;
}

export function getAdminExports(): AdminExportRecord[] {
  return readStore<AdminExportRecord[]>("adminExports", []);
}

export function setAdminExports(records: AdminExportRecord[]) {
  writeStore("adminExports", records);
}

// Wave 1 extension records (local-only, client-safe)
export interface ExtensionRecord {
  id: string;
  title: string;
  description: string;
  createdAt: string;
}

export function getExtensionRecords(key: "ext02Records" | "ext03Records" | "ext04Records" | "ext05Records") {
  return readStore<ExtensionRecord[]>(key, []);
}

export function addExtensionRecord(
  key: "ext02Records" | "ext03Records" | "ext04Records" | "ext05Records",
  record: ExtensionRecord
) {
  const list = getExtensionRecords(key);
  list.push(record);
  writeStore(key, list);
}

// Notifications
export type NotificationType =
  | "ORDER_PLACED"
  | "ORDER_SHIPPED"
  | "PAYMENT_REVIEW_REQUIRED"
  | "RETURN_APPROVED"
  | "REFUND_PROCESSED"
  | "DOCUMENT_READY"
  | "SERVICE_TASK_ASSIGNED"
  | "SERVICE_EVIDENCE_REQUIRED"
  | "SUPPLIER_ORDER_RECEIVED"
  | "SUPPLIER_SHIPMENT_UPDATE"
  | "SUPPLIER_PRODUCT_STATE"
  | "COMPLIANCE_DECISION"
  | "ADMIN_DISPUTE"
  | "SYSTEM_NOTICE";

export interface NotificationRecord {
  id: string;
  buyerEmail: string;
  role?: SessionState["role"];
  type: NotificationType;
  title: string;
  body: string;
  createdAt: string;
  read?: boolean;
  source?: string;
  deliveryStatus?: "DELIVERED" | "READ";
  link?: string;
  relatedId?: string; // e.g., orderId or returnId
}

export function getCart(): CartItem[] {
  return readStore<CartItem[]>("cart", []);
}

export function setCart(items: CartItem[]) {
  writeStore("cart", items);
}

export function addToCart(item: CartItem) {
  const cart = getCart();
  const existing = cart.find((c) => c.productSlug === item.productSlug);
  if (existing) {
    existing.qty += item.qty;
  } else {
    cart.push(item);
  }
  setCart(cart);
}

export function clearCart() {
  setCart([]);
}

export function getOrders(): OrderRecord[] {
  return readStore<OrderRecord[]>("orders", []);
}

export function addOrder(order: OrderRecord) {
  const orders = getOrders();
  orders.push(order);
  writeStore("orders", orders);
}

// Returns helpers
export function getReturns(): ReturnRequest[] {
  return readStore<ReturnRequest[]>("returns", []);
}

export function addReturnRequest(request: ReturnRequest) {
  const returns = getReturns();
  returns.push(request);
  writeStore("returns", returns);
}

export function getWarrantyClaims(): WarrantyClaim[] {
  return readStore<WarrantyClaim[]>("warranties", []);
}

export function addWarrantyClaim(claim: WarrantyClaim) {
  const claims = getWarrantyClaims();
  claims.push(claim);
  writeStore("warranties", claims);
}

export function getBuyerDocuments(): BuyerDocument[] {
  return readStore<BuyerDocument[]>("documents", []);
}

export function setBuyerDocuments(docs: BuyerDocument[]) {
  writeStore("documents", docs);
}

export function getNegotiatedOrders(): NegotiatedOrderRequest[] {
  return readStore<NegotiatedOrderRequest[]>("negotiatedOrders" as StoreKey, []);
}

export function addNegotiatedOrder(request: NegotiatedOrderRequest) {
  const existing = getNegotiatedOrders();
  existing.push(request);
  writeStore("negotiatedOrders" as StoreKey, existing);
}

export function updateNegotiatedOrder(requestId: string, updates: Partial<NegotiatedOrderRequest>) {
  const existing = getNegotiatedOrders();
  const idx = existing.findIndex((r) => r.requestId === requestId);
  if (idx === -1) return;
  existing[idx] = { ...existing[idx], ...updates };
  writeStore("negotiatedOrders" as StoreKey, existing);
}

export function getTickets(): SupportTicket[] {
  return readStore<SupportTicket[]>("tickets", []);
}

export function addTicket(ticket: SupportTicket) {
  const tickets = getTickets();
  tickets.push(ticket);
  writeStore("tickets", tickets);
}

export function getUserContacts(): UserContactProfile[] {
  return readStore<UserContactProfile[]>("userContacts", []);
}

export function getUserContact(role: SessionState["role"], email: string) {
  return getUserContacts().find((contact) => contact.role === role && contact.email === email);
}

export function upsertUserContact(profile: UserContactProfile) {
  const contacts = getUserContacts();
  const idx = contacts.findIndex((entry) => entry.role === profile.role && entry.email === profile.email);
  if (idx === -1) contacts.push(profile);
  else contacts[idx] = { ...contacts[idx], ...profile };
  writeStore("userContacts", contacts);
}

export function getUserAccessOverrides(): UserAccessOverride[] {
  return readStore<UserAccessOverride[]>("userAccessOverrides", []);
}

export function upsertUserAccessOverride(override: UserAccessOverride) {
  const list = getUserAccessOverrides();
  const idx = list.findIndex((entry) => entry.id === override.id);
  if (idx === -1) list.push(override);
  else list[idx] = { ...list[idx], ...override };
  writeStore("userAccessOverrides", list);
}

export function getAccessStatus(role: SessionState["role"], email: string): AccessStatus {
  const match = getUserAccessOverrides().find((entry) => entry.role === role && entry.email === email);
  return match?.status ?? "ACTIVE";
}

export function getAuthAttempts(): AuthAttemptRecord[] {
  return readStore<AuthAttemptRecord[]>("authAttempts", []);
}

export function addAuthAttempt(record: AuthAttemptRecord) {
  const attempts = getAuthAttempts();
  attempts.push(record);
  writeStore("authAttempts", attempts);
}

export function clearAuthAttempts() {
  writeStore("authAttempts", []);
}

export function getServicePartnerTasks(): ServicePartnerTask[] {
  return readStore<ServicePartnerTask[]>("servicePartnerTasks", []);
}

export function setServicePartnerTasks(tasks: ServicePartnerTask[]) {
  writeStore("servicePartnerTasks", tasks);
}

export function addServicePartnerTask(task: ServicePartnerTask) {
  const tasks = getServicePartnerTasks();
  tasks.push(task);
  writeStore("servicePartnerTasks", tasks);
}

export function updateServicePartnerTask(taskId: string, updates: Partial<ServicePartnerTask>) {
  const tasks = getServicePartnerTasks();
  const idx = tasks.findIndex((t) => t.taskId === taskId);
  if (idx === -1) return;
  tasks[idx] = { ...tasks[idx], ...updates, updatedAt: new Date().toISOString() };
  writeStore("servicePartnerTasks", tasks);
}

function emptyComplianceProfile(partnerId: string): ServicePartnerComplianceProfile {
  return {
    partnerId,
    status: "DRAFT",
    updatedAt: new Date().toISOString(),
    changeRequestNote: "",
    changeRequestedAt: "",
    unlockedSections: [],
    adminReviewNotes: "",
    identity: {
      legalName: "",
      tradingName: "",
      businessType: "",
      registrationNumber: "",
      country: "",
      address: "",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      jurisdictions: "",
    },
    accreditation: {
      body: "",
      licenceNumber: "",
      certificationTypes: [],
      standards: "",
      issueDate: "",
      expiryDate: "",
      scopeLimitations: "",
      accreditationCertFile: "",
      scopeDocFile: "",
      regulatorLetterFile: "",
    },
    capabilities: {
      canIssueCertificates: false,
      canInspect: false,
      canReviewReports: false,
      canReject: false,
      canConditionalApprove: false,
      canMandateRemediation: false,
      remoteInspections: false,
      remoteMethodology: "",
      turnaroundDays: "",
    },
    personnel: {
      responsibleOfficer: "",
      technicalLead: "",
      inspectorCount: "",
      licenceNumbers: "",
      licenceExpiries: "",
      licenceFiles: [],
    },
    conflicts: {
      declarations: {
        independentSuppliers: false,
        noFinancialInterest: false,
        noOwnershipLinks: false,
        acceptAuditAccess: false,
        acknowledgePenalties: false,
      },
      conflictDisclosure: "",
    },
    methodology: {
      inspectionSummary: "",
      issuanceWorkflow: "",
      retentionYears: "",
      complaintHandling: "",
      processManualFile: "",
      checklistFile: "",
      sampleCertificateFile: "",
    },
    insurance: {
      insurer: "",
      policyNumber: "",
      coverageAmount: "",
      expiryDate: "",
      certificateFile: "",
    },
    security: {
      documentHandling: false,
      dataProtection: false,
      breachProcess: false,
      iso27001: false,
    },
    declarations: {
      accuracyConfirmed: false,
      agreementAccepted: false,
      auditAccessAccepted: false,
      installerServicePartnerTermsAccepted: false,
      installerServicePartnerTermsAcceptedAt: "",
      signatoryName: "",
      signatoryTitle: "",
      signatureDate: "",
      signature: "",
    },
  };
}

export function getServicePartnerComplianceProfiles(): ServicePartnerComplianceProfile[] {
  return readStore<ServicePartnerComplianceProfile[]>("servicePartnerComplianceProfiles", []);
}

export function getServicePartnerComplianceProfile(partnerId: string): ServicePartnerComplianceProfile {
  const profiles = getServicePartnerComplianceProfiles();
  const match = profiles.find((profile) => profile.partnerId === partnerId);
  return match ?? emptyComplianceProfile(partnerId);
}

export function upsertServicePartnerComplianceProfile(profile: ServicePartnerComplianceProfile) {
  assertNoMoneyFields(profile, "service_partner_compliance_profile_local");
  const profiles = getServicePartnerComplianceProfiles();
  const idx = profiles.findIndex((item) => item.partnerId === profile.partnerId);
  const next = { ...profile, updatedAt: new Date().toISOString() };
  if (idx === -1) profiles.push(next);
  else profiles[idx] = next;
  writeStore("servicePartnerComplianceProfiles", profiles);
}

export function getServicePartnerInterestSignals(): ServicePartnerInterestSignal[] {
  return readStore<ServicePartnerInterestSignal[]>("servicePartnerInterestSignals", []);
}

export function upsertServicePartnerInterestSignal(signal: ServicePartnerInterestSignal) {
  const list = getServicePartnerInterestSignals();
  const idx = list.findIndex((item) => item.id === signal.id);
  const next = { ...signal, updatedAt: new Date().toISOString() };
  if (idx === -1) list.push(next);
  else list[idx] = next;
  writeStore("servicePartnerInterestSignals", list);
}

export interface ServicePartnerDocument {
  id: string;
  servicePartnerId: string;
  taskId?: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
}

export function getServicePartnerDocuments(): ServicePartnerDocument[] {
  return readStore<ServicePartnerDocument[]>("servicePartnerDocuments", []);
}

export function addServicePartnerDocument(doc: ServicePartnerDocument) {
  const docs = getServicePartnerDocuments();
  docs.push(doc);
  writeStore("servicePartnerDocuments", docs);
}

export function removeServicePartnerDocument(id: string) {
  const docs = getServicePartnerDocuments().filter((doc) => doc.id !== id);
  writeStore("servicePartnerDocuments", docs);
}

export interface FreightDocument {
  id: string;
  shipmentId: string;
  name: string;
  type: "B/L" | "AWB" | "Invoice" | "Packing List" | "Proof of Delivery";
  uploadedAt: string;
}

export function getFreightDocuments(): FreightDocument[] {
  return readStore<FreightDocument[]>("freightDocuments", []);
}

export function addFreightDocument(doc: FreightDocument) {
  const docs = getFreightDocuments();
  docs.push(doc);
  writeStore("freightDocuments", docs);
}

export function removeFreightDocument(id: string) {
  const docs = getFreightDocuments().filter((doc) => doc.id !== id);
  writeStore("freightDocuments", docs);
}

export type FreightExceptionStatus = "OPEN" | "IN_REVIEW" | "RESOLVED";
export interface FreightException {
  id: string;
  shipmentId: string;
  issueType: "Delay" | "Damage" | "Loss" | "Customs Hold" | "Documentation";
  severity: "Low" | "Medium" | "High";
  status: FreightExceptionStatus;
  evidenceNote?: string;
  createdAt: string;
  updatedAt: string;
}

export function getFreightExceptions(): FreightException[] {
  return readStore<FreightException[]>("freightExceptions", []);
}

export function addFreightException(record: FreightException) {
  const list = getFreightExceptions();
  list.push(record);
  writeStore("freightExceptions", list);
}

export function updateFreightException(id: string, updates: Partial<FreightException>) {
  const list = getFreightExceptions();
  const idx = list.findIndex((entry) => entry.id === id);
  if (idx === -1) return;
  list[idx] = { ...list[idx], ...updates, updatedAt: new Date().toISOString() };
  writeStore("freightExceptions", list);
}

export function getNotifications(): NotificationRecord[] {
  return readStore<NotificationRecord[]>("notifications" as StoreKey, []);
}

export function setNotifications(notifications: NotificationRecord[]) {
  writeStore("notifications" as StoreKey, notifications);
}

// Admin flags
export interface AdminFlags {
  weeklyDealOverride?: boolean;
  refundOverride?: boolean;
  settlementOverride?: boolean;
}

export function getAdminFlags(): AdminFlags {
  return readStore<AdminFlags>("adminFlags", {});
}

export function setAdminFlags(flags: AdminFlags) {
  writeStore("adminFlags", flags);
}
