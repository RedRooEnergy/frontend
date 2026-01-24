import { Request, Response, NextFunction } from "express";
import { generateRequestId } from "./request-id";
import { buildActorContext } from "../auth/build-actor-context";
import { CoreRole } from "../auth/roles";

export function requestContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = generateRequestId();
  const baseActor = buildActorContext();
  const headerRole = req.header("x-actor-role") as CoreRole | undefined;
  const headerActorId = req.header("x-actor-id") ?? undefined;

  const actor = Object.freeze({
    actorId: headerActorId ?? baseActor.actorId,
    role: headerRole ?? baseActor.role,
    source: baseActor.source,
  });

  const context = Object.freeze({
    requestId,
    actor,
  });

  (req as any).context = context;
  (res as any).locals = (res as any).locals ?? {};
  (res as any).locals.requestContext = context;

  next();
}
