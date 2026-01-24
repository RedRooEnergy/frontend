import { SupplierRecord } from "./supplier-record";

const registry = new Map<string, SupplierRecord>();

export function registerSupplier(record: SupplierRecord): void {
  if (registry.has(record.supplierId)) {
    throw new Error(
      `[CORE] Supplier ${record.supplierId} already registered (immutability enforced)`
    );
  }

  registry.set(record.supplierId, Object.freeze(record));
}

export function listRegisteredSuppliers(): SupplierRecord[] {
  return Array.from(registry.values());
}

export function getSupplierById(
  supplierId: string
): SupplierRecord | undefined {
  return registry.get(supplierId);
}
