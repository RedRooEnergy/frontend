import fs from "fs/promises";
import path from "path";
import {
  buildAuthorityGuardDailySummary,
  filterAuthorityGuardIndexByDate,
  parseAuthorityGuardIndexLine,
  renderAuthorityGuardDailyDigestMarkdown,
} from "../../lib/governance/authority/guardDigest";

type CliOptions = {
  index: string;
  dateUtc: string;
  out?: string;
};

function parseArgValue(args: string[], key: string) {
  const index = args.indexOf(key);
  if (index === -1) return undefined;
  const next = args[index + 1];
  if (!next || next.startsWith("--")) return undefined;
  return next;
}

function resolveTodayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function parseCliOptions(argv: string[]): CliOptions {
  return {
    index:
      parseArgValue(argv, "--index") ||
      "artefacts/governance/authority-auto-guard/index.jsonl",
    dateUtc: parseArgValue(argv, "--date") || resolveTodayUtc(),
    out: parseArgValue(argv, "--out"),
  };
}

async function main() {
  const options = parseCliOptions(process.argv.slice(2));
  const indexPath = path.resolve(process.cwd(), options.index);
  const raw = await fs.readFile(indexPath, "utf8");
  const records = raw
    .split(/\r?\n/g)
    .map(parseAuthorityGuardIndexLine)
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  const filtered = filterAuthorityGuardIndexByDate(records, options.dateUtc);
  const summary = buildAuthorityGuardDailySummary(filtered, options.dateUtc);
  const markdown = renderAuthorityGuardDailyDigestMarkdown({
    summary,
    indexPath,
  });

  if (options.out) {
    const outPath = path.resolve(process.cwd(), options.out);
    await fs.writeFile(outPath, `${markdown}\n`, "utf8");
  }

  process.stdout.write(`${markdown}\n`);
}

main().catch((error: any) => {
  process.stderr.write(`${String(error?.message || error)}\n`);
  process.exitCode = 1;
});
