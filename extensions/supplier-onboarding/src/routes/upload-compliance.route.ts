import { Request, Response } from "express";
import { appendComplianceDocument } from "../compliance/append-compliance-document";
import {
  getSupplierDraft,
  updateSupplierDraft,
} from "../store/supplier-draft-store";
import { issueDocumentHashAudited } from "../../../../core/platform/src/documents/issue-document-hash-audited";
import { CoreError } from "../../../../core/platform/src/errors/core-error";

export function uploadComplianceDocument(req: Request, res: Response): void {
  throw new Error("EXTENSION_LOCKED: Supplier Onboarding is read-only");
  const { supplierId } = req.params;
  const { type, content } = req.body ?? {};
  const { requestId } = (req as any).context;

  if (!type || !content) {
    throw new CoreError(
      "INVALID_REQUEST",
      "Missing compliance document type or content",
      400,
      requestId ?? "UNKNOWN"
    );
  }

  const draft = getSupplierDraft(supplierId);

  if (!draft) {
    throw new CoreError("INVALID_REQUEST", "Supplier draft not found", 404, requestId ?? "UNKNOWN");
  }

  if (draft.status !== "DRAFT") {
    throw new CoreError(
      "INVALID_REQUEST",
      "Compliance uploads only allowed in DRAFT",
      409,
      requestId ?? "UNKNOWN"
    );
  }

  const documentId = `${supplierId}-${type}`;

  if (draft.complianceDocuments.find((d) => d.documentId === documentId)) {
    throw new CoreError(
      "INVALID_REQUEST",
      "Duplicate compliance document",
      409,
      requestId ?? "UNKNOWN"
    );
  }

  const hash = issueDocumentHashAudited(documentId, content, requestId ?? "UNKNOWN");

  const updatedDocs = appendComplianceDocument(
    draft.complianceDocuments,
    {
      documentId,
      type,
      hash: hash.hash,
      uploadedAt: hash.createdAt,
    },
    requestId ?? "UNKNOWN"
  );

  const updatedDraft = updateSupplierDraft({
    ...draft,
    complianceDocuments: updatedDocs,
  });

  res.status(201).json({ documentId });
}
