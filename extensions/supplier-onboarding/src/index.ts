import express, { type Application } from "express";
import { buildSupplierHealthRouter } from "./routes/health.route";
import { buildCreateDraftRouter } from "./routes/create-draft.route";
import { buildSubmitDraftRouter } from "./routes/submit-draft.route";
import { uploadComplianceDocument } from "./routes/upload-compliance.route";
import { verifyComplianceRoute } from "./routes/verify-compliance.route";
import { activateSupplierRoute } from "./routes/activate-supplier.route";
import { listActiveSuppliersRoute } from "./routes/list-active-suppliers.route";

export const EXTENSION_ID = "EXT-01-SUPPLIER-ONBOARDING";

export function registerSupplierOnboarding(app: Application): void {
  app.use("/ext/supplier-onboarding", express.json());
  app.use("/ext/supplier-onboarding", buildSupplierHealthRouter());
  app.use("/ext/supplier-onboarding", buildCreateDraftRouter());
  app.use("/ext/supplier-onboarding", buildSubmitDraftRouter());
  app.post("/ext/supplier-onboarding/drafts/:supplierId/compliance", uploadComplianceDocument);
  app.post(
    "/ext/supplier-onboarding/drafts/:supplierId/verify-compliance",
    verifyComplianceRoute
  );
  app.post(
    "/ext/supplier-onboarding/drafts/:supplierId/activate",
    activateSupplierRoute
  );
  app.get(
    "/ext/supplier-onboarding/registry/active",
    listActiveSuppliersRoute
  );
}
