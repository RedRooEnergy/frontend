import { Request, Response } from "express";
import { calculateDDPAudited } from "../calc";

export function calculateDDPRoute(req: Request, res: Response): void {
  const requestId = res.locals.requestContext?.requestId ?? (req as any).context?.requestId;

  const result = calculateDDPAudited(req.body, requestId ?? "UNKNOWN");

  res.status(200).json({
    requestId,
    result,
  });
}
