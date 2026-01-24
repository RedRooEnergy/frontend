import { Request, Response } from "express";

export function approveCatalogueDraft(_req: Request, res: Response): void {
  res.status(501).json({ message: "Catalogue approval not implemented" });
}
