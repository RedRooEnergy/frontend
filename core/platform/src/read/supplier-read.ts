import { getSupplierById } from "../registry/supplier-registry";
import { SupplierPublicView } from "../contracts/supplier.contract";

export function readSupplier(
  supplierId: string
): SupplierPublicView | undefined {
  const record = getSupplierById(supplierId);
  if (!record) return undefined;

  return {
    supplierId: record.supplierId,
    legalName: record.legalName,
    country: record.country,
    activatedAt: record.activatedAt,
  };
}
