import { Request, Response, NextFunction } from "express";
import { CoreError } from "./core-error";

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): Response {
  if (err instanceof CoreError) {
    return res.status(err.httpStatus).json({
      error: err.code,
      message: err.safeMessage,
      requestId: err.requestId,
    });
  }

  return res.status(500).json({
    error: "INTERNAL_ERROR",
    message: "An unexpected error occurred",
    requestId: "UNKNOWN",
  });
}
