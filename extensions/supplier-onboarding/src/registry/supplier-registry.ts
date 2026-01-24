import { supplierDraftStore } from "../store/supplier-draft-store";

export function getActiveSuppliers() {
  return supplierDraftStore
    .list()
    .filter(
      (draft) =>
        draft.activationStatus === "ACTIVE" &&
        draft.complianceStatus === "VERIFIED"
    )
    .map((draft) => ({
      supplierId: draft.supplierId,
      legalName: draft.legalName,
      country: draft.country,
      activatedAt: draft.updatedAt ?? draft.createdAt,
    }));
}
