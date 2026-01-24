import { issueDocumentHash } from "./issue-document-hash";

const hash = issueDocumentHash(
  "DOC-TEST-001",
  "Immutable document payload"
);

// eslint-disable-next-line no-console
console.log(hash);
