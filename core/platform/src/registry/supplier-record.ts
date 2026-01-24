export interface SupplierRecord {
  readonly supplierId: string;
  readonly legalName: string;
  readonly country: string;
  readonly activatedAt: string;
  readonly source: "SUPPLIER_ONBOARDING";
}
