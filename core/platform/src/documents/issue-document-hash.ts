import { generateDocumentHash } from "./hash-generator";
import { DocumentHash } from "./types/document-hash";

export function issueDocumentHash(
  documentId: string,
  payload: string
): DocumentHash {
  return {
    documentId,
    hash: generateDocumentHash(payload),
    algorithm: "SHA-256",
    createdAt: new Date().toISOString(),
    createdBy: "system",
  };
}
