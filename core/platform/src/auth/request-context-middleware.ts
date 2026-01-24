import { Request, Response, NextFunction } from "express";
import { buildSystemActor } from "./build-actor-context";
import { RequestContext } from "./request-context";

declare module "express-serve-static-core" {
  interface Request {
    context?: RequestContext;
  }
}

export function attachRequestContext(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  req.context = Object.freeze({
    actor: buildSystemActor(),
  });

  next();
}
