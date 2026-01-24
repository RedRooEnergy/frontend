import { issueDocumentHashAudited } from "./issue-document-hash-audited";

const result = issueDocumentHashAudited(
  "DOC-AUDIT-001",
  "Audited immutable document payload",
  "TEST-REQUEST-ID"
);

// eslint-disable-next-line no-console
console.log(result);
