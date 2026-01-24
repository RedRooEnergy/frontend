/**
 * Document Projection Adapter
 * Buyer-visible document metadata only.
 * No file access. No download logic.
 */

export function projectDocumentsForBuyer(coreDocuments: any[]) {
  if (!Array.isArray(coreDocuments)) {
    return [];
  }

  return coreDocuments.map(doc => ({
    documentId: doc.id,
    type: doc.type,
    filename: doc.filename,
    uploadedAt: doc.uploadedAt,
    status: doc.status
  }));
}
