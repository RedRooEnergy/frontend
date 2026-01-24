import { Router } from "express";
import { readSupplier } from "../read/supplier-read";

export const readSupplierRouter = Router();

readSupplierRouter.get("/suppliers/:id", (req, res) => {
  const supplier = readSupplier(req.params.id);

  if (!supplier) {
    return res.status(404).json({ error: "SUPPLIER_NOT_FOUND" });
  }

  res.json(supplier);
});
