import { Request, Response } from "express";

export function publishCatalogue(_req: Request, res: Response): void {
  res.status(501).json({ message: "Catalogue publication not implemented" });
}
