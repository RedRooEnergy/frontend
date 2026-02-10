import fs from "node:fs";
import path from "node:path";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { stampClauseMarkers } from "../pdf/stamp-clause-markers";

function resolveRootDir() {
  const cwd = process.cwd();
  const hasFrontendPackage = fs.existsSync(path.join(cwd, "package.json"));
  return hasFrontendPackage ? path.resolve(cwd, "..") : cwd;
}

async function run() {
  const rootDir = resolveRootDir();
  const defaultBase = path.join(
    rootDir,
    "artifacts",
    "governance",
    "EXT-BUYER-01_GOVERNANCE_PACK_v1.0.base.pdf"
  );
  const defaultOut = path.join(
    rootDir,
    "artifacts",
    "governance",
    "EXT-BUYER-01_GOVERNANCE_PACK_v1.0.pdf"
  );
  const defaultClauseIndex = path.join(
    rootDir,
    "docs",
    "extensions",
    "EXT-BUYER-01",
    "CLAUSE_INDEX.json"
  );
  const defaultClauseMarkers = path.join(
    rootDir,
    "docs",
    "extensions",
    "EXT-BUYER-01",
    "CLAUSE_MARKERS.json"
  );

  const argv = await yargs(hideBin(process.argv))
    .options({
      base: { type: "string", default: defaultBase, describe: "Base governance PDF path" },
      out: { type: "string", default: defaultOut, describe: "Stamped governance PDF output path" },
      clauseIndex: {
        type: "string",
        default: defaultClauseIndex,
        describe: "Clause index JSON path",
      },
      clauseMarkers: {
        type: "string",
        default: defaultClauseMarkers,
        describe: "Clause markers JSON path (optional)",
      },
    })
    .strict()
    .parse();

  if (!fs.existsSync(argv.base)) {
    throw new Error(
      `Base governance PDF not found at ${argv.base}. Generate the base PDF before stamping.`
    );
  }

  await stampClauseMarkers({
    inputPath: argv.base,
    outputPath: argv.out,
    clauseIndexPath: argv.clauseIndex,
    clauseMarkersPath: fs.existsSync(argv.clauseMarkers) ? argv.clauseMarkers : undefined,
  });
}

run().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
