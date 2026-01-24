import type { ComplianceStatus } from "../compliance/compliance-status";
import type { ComplianceDocument } from "../compliance/compliance-document";
import type { SupplierActivationStatus } from "../activation/supplier-activation-status";

export type SupplierDraft = {
  readonly supplierId: string;
  readonly status: "DRAFT" | "SUBMITTED";
  readonly createdAt: string;
  readonly updatedAt?: string;
  readonly legalName?: string;
  readonly country?: string;
  readonly complianceStatus: ComplianceStatus;
  readonly complianceDocuments: ReadonlyArray<ComplianceDocument>;
  readonly activationStatus: SupplierActivationStatus;
};

const drafts = new Map<string, SupplierDraft>();

export function createSupplierDraft(supplierId: string): SupplierDraft {
  throw new Error("EXTENSION_LOCKED: Mutation prohibited");
  if (drafts.has(supplierId)) {
    throw new Error(`Supplier draft already exists: ${supplierId}`);
  }

  const draft: SupplierDraft = Object.freeze({
    supplierId,
    status: "DRAFT",
    createdAt: new Date().toISOString(),
    complianceStatus: "UNVERIFIED",
    complianceDocuments: [],
    activationStatus: "INACTIVE",
  });

  drafts.set(supplierId, draft);
  return draft;
}

export function getSupplierDraft(supplierId: string): SupplierDraft | undefined {
  return drafts.get(supplierId);
}

export function updateSupplierDraft(updated: SupplierDraft): SupplierDraft {
  throw new Error("EXTENSION_LOCKED: Mutation prohibited");
  const frozen = Object.freeze({ ...updated });
  drafts.set(updated.supplierId, frozen);
  return frozen;
}

export function listSupplierDrafts(): ReadonlyArray<SupplierDraft> {
  return Array.from(drafts.values());
}

export function submitSupplierDraft(supplierId: string) {
  throw new Error("EXTENSION_LOCKED: Mutation prohibited");
  const existing = drafts.get(supplierId);

  if (!existing) {
    throw new Error(`Supplier draft not found: ${supplierId}`);
  }

  if (existing.status !== "DRAFT") {
    throw new Error(`Invalid state transition for ${supplierId}`);
  }

  const submitted = Object.freeze({
    ...existing,
    status: "SUBMITTED"
  });

  return updateSupplierDraft(submitted);
}

export const supplierDraftStore = {
  get: getSupplierDraft,
  update: updateSupplierDraft,
  create: createSupplierDraft,
  submit: submitSupplierDraft,
  list: listSupplierDrafts,
};
