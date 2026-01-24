import { issueDocumentHash } from "./issue-document-hash";
import { emitAuditEvent } from "../audit/audit-logger";
import {
  assertNotIssued,
  markIssued,
} from "../core/immutability/immutability-registry";

export function issueDocumentHashAudited(
  documentId: string,
  payload: string,
  requestId: string
) {
  assertNotIssued(documentId);

  const hash = issueDocumentHash(documentId, payload);

  emitAuditEvent({
    eventId: "AUDIT-DOC-HASH-ISSUED",
    timestamp: new Date().toISOString(),
    actor: "system",
    action: "DOCUMENT_HASH_ISSUED",
    resource: documentId,
    outcome: "ALLOW",
    severity: "INFO",
    scope: "DATA_MUTATION",
    requestId,
    metadata: {
      algorithm: hash.algorithm,
      hash: hash.hash,
    },
  });

  markIssued(documentId);
  return hash;
}
