import { CoreError } from "../../../../core/platform/src/errors/core-error";
import type { ComplianceDocument } from "./compliance-document";

export function appendComplianceDocument(
  docs: ReadonlyArray<ComplianceDocument>,
  doc: ComplianceDocument,
  requestId: string
): ReadonlyArray<ComplianceDocument> {
  if (docs.find((d) => d.documentId === doc.documentId)) {
    throw new CoreError(
      "INVALID_REQUEST",
      "Duplicate compliance document",
      409,
      requestId
    );
  }

  return Object.freeze([...docs, Object.freeze(doc)]);
}
