import { exportAuthorityEvidencePack } from "../governance/authority/export";

type AuthorityExportRunner = typeof exportAuthorityEvidencePack;

let authorityExportRunner: AuthorityExportRunner = exportAuthorityEvidencePack;

export function getAuthorityExportRunner(): AuthorityExportRunner {
  return authorityExportRunner;
}

export function setAuthorityExportRunnerForTests(runner?: AuthorityExportRunner) {
  authorityExportRunner = runner || exportAuthorityEvidencePack;
}
