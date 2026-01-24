export interface DocumentHashRead {
  documentId: string;
  algorithm: string;
  hash: string;
  issuedAt: string;
  issuedBy: "system";
}
