import { Router } from "express";
import { getCrmCaseById, listCrmCasesByEntity } from "../crm/crmCaseStore";

const router = Router();

router.get("/cases", async (req, res, next) => {
  try {
    const entityTypeRaw = req.query.entityType;
    const entityIdRaw = req.query.entityId;

    const entityType = typeof entityTypeRaw === "string" ? entityTypeRaw : undefined;
    const entityId = typeof entityIdRaw === "string" ? entityIdRaw : undefined;

    const cases = await listCrmCasesByEntity(entityType, entityId);
    res.status(200).json({ cases });
  } catch (err) {
    next(err);
  }
});

router.get("/cases/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const crmCase = await getCrmCaseById(String(id));

    if (!crmCase) {
      const error = new Error("CRM_CASE_NOT_FOUND");
      (error as Error & { status?: number }).status = 404;
      throw error;
    }

    res.status(200).json(crmCase);
  } catch (err) {
    next(err);
  }
});

export { router as crmRouter };
export default router;
