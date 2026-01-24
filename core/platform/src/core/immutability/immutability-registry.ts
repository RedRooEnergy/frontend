const issuedDocuments = new Set<string>();

export function assertNotIssued(documentId: string): void {
  if (issuedDocuments.has(documentId)) {
    throw new Error(
      `[CORE] Immutability violation: document '${documentId}' already issued`
    );
  }
}

export function markIssued(documentId: string): void {
  issuedDocuments.add(documentId);
}
