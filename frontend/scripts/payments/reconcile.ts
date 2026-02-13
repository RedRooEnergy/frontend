import crypto from "crypto";
import fs from "fs/promises";
import { runPaymentsReconciliation, type ReconciliationSource } from "../../lib/payments/reconciliation";

type CliOptions = {
  mode: "local" | "http";
  source: ReconciliationSource;
  url?: string;
  secret?: string;
  orderId?: string;
  fromUtc?: string;
  toUtc?: string;
  limit?: number;
  tenantId?: string;
  out?: string;
};

function parseArgValue(args: string[], key: string) {
  const index = args.indexOf(key);
  if (index === -1) return undefined;
  const next = args[index + 1];
  if (!next || next.startsWith("--")) return undefined;
  return next;
}

function parseCliOptions(argv: string[]): CliOptions {
  const mode = (parseArgValue(argv, "--mode") || "local").trim().toLowerCase();
  const sourceRaw = (parseArgValue(argv, "--source") || "").trim();
  const source: ReconciliationSource =
    sourceRaw === "api_internal" || sourceRaw === "cli_http" || sourceRaw === "cli_local"
      ? sourceRaw
      : mode === "http"
      ? "cli_http"
      : "cli_local";

  const rawLimit = parseArgValue(argv, "--limit");
  const parsedLimit = rawLimit ? Number(rawLimit) : undefined;

  return {
    mode: mode === "http" ? "http" : "local",
    source,
    url: parseArgValue(argv, "--url"),
    secret: parseArgValue(argv, "--secret") || process.env.PAYMENTS_RECONCILIATION_JOB_SECRET,
    orderId: parseArgValue(argv, "--orderId"),
    fromUtc: parseArgValue(argv, "--from"),
    toUtc: parseArgValue(argv, "--to"),
    limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
    tenantId: parseArgValue(argv, "--tenantId"),
    out: parseArgValue(argv, "--out"),
  };
}

function signPayload(secret: string, timestamp: number, rawBody: string) {
  return crypto.createHmac("sha256", secret).update(`${timestamp}.${rawBody}`, "utf8").digest("hex");
}

async function runLocal(options: CliOptions) {
  return runPaymentsReconciliation({
    source: options.source,
    tenantId: String(options.tenantId || "").trim() || null,
    filters: {
      orderId: options.orderId,
      fromUtc: options.fromUtc,
      toUtc: options.toUtc,
      limit: options.limit,
    },
  });
}

async function runHttp(options: CliOptions) {
  const url = String(options.url || "").trim();
  if (!url) {
    throw new Error("reconcile cli requires --url for http mode");
  }

  const secret = String(options.secret || "").trim();
  if (!secret) {
    throw new Error("reconcile cli requires --secret or PAYMENTS_RECONCILIATION_JOB_SECRET for http mode");
  }

  const payload = {
    source: options.source,
    orderId: options.orderId,
    fromUtc: options.fromUtc,
    toUtc: options.toUtc,
    limit: options.limit,
    tenantId: options.tenantId,
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
    throw new Error(`reconcile http failed (${response.status}): ${text}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("reconcile http returned non-json response");
  }
}

async function main() {
  const options = parseCliOptions(process.argv.slice(2));

  const report = options.mode === "http" ? await runHttp(options) : await runLocal(options);
  const output = JSON.stringify(report, null, 2);

  if (options.out) {
    await fs.writeFile(options.out, `${output}\n`, "utf8");
  }

  process.stdout.write(`${output}\n`);
}

main().catch((error: any) => {
  process.stderr.write(`${String(error?.message || error)}\n`);
  process.exitCode = 1;
});
