import crypto from "crypto";
import fs from "fs/promises";
import { runAuthorityShadowMetricsSnapshot } from "../../lib/governance/authority/shadowMetrics";
import {
  evaluateAuthorityEnforcementGuard,
  type AuthorityEnforcementGuardThresholds,
} from "../../lib/governance/authority/enforcementGuard";
import type { AuthorityShadowMetricsReport } from "../../lib/governance/authority/shadowTypes";

type CliOptions = {
  mode: "local" | "http";
  source: "api_internal" | "cli_local" | "cli_http";
  url?: string;
  secret?: string;
  fromUtc?: string;
  toUtc?: string;
  limit?: number;
  tenantId?: string;
  policyId?: string;
  out?: string;
  thresholds: Partial<AuthorityEnforcementGuardThresholds>;
};

function parseArgValue(args: string[], key: string) {
  const index = args.indexOf(key);
  if (index === -1) return undefined;
  const next = args[index + 1];
  if (!next || next.startsWith("--")) return undefined;
  return next;
}

function parseNumber(value: string | undefined) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseCliOptions(argv: string[]): CliOptions {
  const mode = (parseArgValue(argv, "--mode") || "local").trim().toLowerCase();
  const sourceRaw = (parseArgValue(argv, "--source") || "").trim();
  const source: "api_internal" | "cli_local" | "cli_http" =
    sourceRaw === "api_internal" || sourceRaw === "cli_local" || sourceRaw === "cli_http"
      ? sourceRaw
      : mode === "http"
      ? "cli_http"
      : "cli_local";

  return {
    mode: mode === "http" ? "http" : "local",
    source,
    url: parseArgValue(argv, "--url"),
    secret: parseArgValue(argv, "--secret") || process.env.GOV04_AUTHORITY_SHADOW_METRICS_JOB_SECRET,
    fromUtc: parseArgValue(argv, "--from"),
    toUtc: parseArgValue(argv, "--to"),
    limit: parseNumber(parseArgValue(argv, "--limit")),
    tenantId: parseArgValue(argv, "--tenantId"),
    policyId: parseArgValue(argv, "--policyId"),
    out: parseArgValue(argv, "--out"),
    thresholds: {
      conflictRateWarn: parseNumber(parseArgValue(argv, "--conflictRateWarn")),
      conflictRatePage: parseNumber(parseArgValue(argv, "--conflictRatePage")),
      caseOpenRateWarn: parseNumber(parseArgValue(argv, "--caseOpenRateWarn")),
      caseOpenRatePage: parseNumber(parseArgValue(argv, "--caseOpenRatePage")),
      policyVersionUnresolvedRateWarn: parseNumber(parseArgValue(argv, "--policyVersionUnresolvedRateWarn")),
      policyVersionUnresolvedRatePage: parseNumber(parseArgValue(argv, "--policyVersionUnresolvedRatePage")),
      shadowVsEnforcementDivergenceRateWarn: parseNumber(
        parseArgValue(argv, "--shadowVsEnforcementDivergenceRateWarn")
      ),
      shadowVsEnforcementDivergenceRatePage: parseNumber(
        parseArgValue(argv, "--shadowVsEnforcementDivergenceRatePage")
      ),
    },
  };
}

function signPayload(secret: string, timestamp: number, rawBody: string) {
  return crypto.createHmac("sha256", secret).update(`${timestamp}.${rawBody}`, "utf8").digest("hex");
}

async function runLocal(options: CliOptions) {
  return runAuthorityShadowMetricsSnapshot({
    source: options.source,
    fromUtc: options.fromUtc,
    toUtc: options.toUtc,
    limit: options.limit,
    tenantId: options.tenantId,
    policyId: options.policyId,
  });
}

async function runHttp(options: CliOptions) {
  const url = String(options.url || "").trim();
  if (!url) {
    throw new Error("authority enforcement guard requires --url for http mode");
  }

  const secret = String(options.secret || "").trim();
  if (!secret) {
    throw new Error("authority enforcement guard requires --secret or GOV04_AUTHORITY_SHADOW_METRICS_JOB_SECRET");
  }

  const payload = {
    source: options.source,
    fromUtc: options.fromUtc,
    toUtc: options.toUtc,
    limit: options.limit,
    tenantId: options.tenantId,
    policyId: options.policyId,
  };

  const rawBody = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signPayload(secret, timestamp, rawBody);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-rre-job-timestamp": String(timestamp),
      "x-rre-job-signature": signature,
    },
    body: rawBody,
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`authority enforcement guard http failed (${response.status}): ${text}`);
  }

  try {
    return JSON.parse(text) as AuthorityShadowMetricsReport;
  } catch {
    throw new Error("authority enforcement guard http returned non-json response");
  }
}

async function main() {
  const options = parseCliOptions(process.argv.slice(2));
  const report = options.mode === "http" ? await runHttp(options) : await runLocal(options);
  const evaluation = evaluateAuthorityEnforcementGuard(report, options.thresholds);
  const output = JSON.stringify(
    {
      report,
      guard: evaluation,
    },
    null,
    2
  );

  if (options.out) {
    await fs.writeFile(options.out, `${output}\n`, "utf8");
  }

  process.stdout.write(`${output}\n`);
  if (evaluation.rollbackRecommended) {
    process.exitCode = 2;
  }
}

main().catch((error: any) => {
  process.stderr.write(`${String(error?.message || error)}\n`);
  process.exitCode = 1;
});
