/**
 * Records & Evidence Routes
 * Read-only access to documents and evidence linked to authorised entities.
 */

import {
  projectRecord
} from "../adapters/recordProjection.adapter";

function assertRecordScope(
  req: any,
  res: any,
  requiredScope: string
): boolean {
  const auth = req.auth;

  if (!auth) {
    res.status(401).json({ error: "AUTH_REQUIRED" });
    return false;
  }

  if (!Array.isArray(auth.scopes) || !auth.scopes.includes(requiredScope)) {
    res.status(403).json({ error: "INSUFFICIENT_SCOPE" });
    return false;
  }

  return true;
}

export function registerRecordsRoutes(app: any) {
  app.get("/records/health", (_req: any, res: any) => {
    res.json({
      extension: "EXT-14",
      status: "READ_ONLY_ACTIVE"
    });
  });

  app.get("/records", (req: any, res: any) => {
    if (!assertRecordScope(req, res, "RECORD_VIEW")) return;

    const coreRecords: any[] = []; // Core injection point (not implemented)

    const projections = coreRecords.map(r =>
      projectRecord(r)
    );

    res.status(200).json({
      source: "CORE",
      records: projections
    });
  });

  app.get("/records/:recordId", (req: any, res: any) => {
    if (!assertRecordScope(req, res, "RECORD_VIEW")) return;

    const coreRecord = null; // Core injection point (not implemented)

    const projection = coreRecord
      ? projectRecord(coreRecord)
      : null;

    res.status(200).json({
      source: "CORE",
      record: projection
    });
  });
}
