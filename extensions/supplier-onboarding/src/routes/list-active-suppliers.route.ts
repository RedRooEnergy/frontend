import { Request, Response } from "express";
import { getActiveSuppliers } from "../registry/supplier-registry";
import { authorizeHealthOnly } from "../../../../core/platform/src/auth/authorize";

export function listActiveSuppliersRoute(
  _req: Request,
  res: Response
): void {
  // marketplace-safe, read-only
  authorizeHealthOnly("SYSTEM");

  const suppliers = getActiveSuppliers();

  res.status(200).json({
    count: suppliers.length,
    suppliers,
  });
}
