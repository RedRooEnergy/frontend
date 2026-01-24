import { Router } from "express";

export function buildSupplierHealthRouter(): Router {
  const router = Router();

  router.get("/_health", (_req, res) => {
    res.status(200).json({
      extension: "supplier-onboarding",
      status: "ok"
    });
  });

  return router;
}
