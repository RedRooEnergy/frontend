export interface DocumentHash {
  documentId: string;
  hash: string;
  algorithm: "SHA-256";
  createdAt: string;
  createdBy: "system";
}
