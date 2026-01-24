import { Request, Response, NextFunction } from "express";
import { authorize } from "./authorize";

export function enforceAuthorization(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const ctx = (req as any).context;
  const requestId = ctx?.requestId ?? "UNKNOWN";
  authorize(req.path, requestId);
  next();
}
