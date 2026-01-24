import { Request, Response } from "express";

export function createCatalogueDraft(_req: Request, res: Response): void {
  res.status(501).json({ message: "Catalogue draft creation not implemented" });
}
