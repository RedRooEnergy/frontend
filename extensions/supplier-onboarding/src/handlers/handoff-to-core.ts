import { registerSupplier } from "../../../../core/platform/src/registry/supplier-registry";
import { SupplierDraft } from "../store/supplier-draft-store";

export function handoffSupplierToCore(draft: SupplierDraft): void {
  registerSupplier({
    supplierId: draft.supplierId,
    legalName: draft.legalName ?? "",
    country: draft.country ?? "",
    activatedAt: draft.updatedAt ?? draft.createdAt,
    source: "SUPPLIER_ONBOARDING",
  });
}
