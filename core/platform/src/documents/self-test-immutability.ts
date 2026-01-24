import { issueDocumentHashAudited } from "./issue-document-hash-audited";

issueDocumentHashAudited("DOC-IMM-001", "first payload", "TEST-REQUEST-ID-1");

try {
  issueDocumentHashAudited("DOC-IMM-001", "second payload", "TEST-REQUEST-ID-2");
} catch (err) {
  // eslint-disable-next-line no-console
  console.log("EXPECTED ERROR:", (err as Error).message);
}
