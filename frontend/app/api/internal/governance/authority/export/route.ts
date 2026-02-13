import crypto from "crypto";
import { NextResponse } from "next/server";
import { isAuthorityObserveEnabled } from "../../../../../../lib/governance/authority/config";
import { exportAuthorityEvidencePack } from "../../../../../../lib/governance/authority/export";

type AuthorityExportRunner = typeof exportAuthorityEvidencePack;

let exportRunner: AuthorityExportRunner = exportAuthorityEvidencePack;

export function __setAuthorityExportRunnerForTests(runner?: AuthorityExportRunner) {
  exportRunner = runner || exportAuthorityEvidencePack;
}

function safeEqualHex(left: string, right: string) {
  const leftBuf = Buffer.from(String(left || ""), "utf8");
  const rightBuf = Buffer.from(String(right || ""), "utf8");
  if (leftBuf.length !== rightBuf.length) return false;
  return crypto.timingSafeEqual(leftBuf, rightBuf);
}

function verifySignature(rawBody: string, headers: Headers) {
  const secret = String(process.env.GOV04_AUTHORITY_EXPORT_JOB_SECRET || "").trim();
  if (!secret) {
    throw new Error("GOV04_AUTHORITY_EXPORT_JOB_SECRET_NOT_CONFIGURED");
  }

  const signature = String(headers.get("x-rre-job-signature") || "").trim();
  const timestampRaw = String(headers.get("x-rre-job-timestamp") || "").trim();
  const timestamp = Number(timestampRaw);

  if (!signature || !Number.isFinite(timestamp) || timestamp <= 0) {
    throw new Error("GOV04_AUTHORITY_EXPORT_SIGNATURE_HEADER_INVALID");
  }

  const nowUnix = Math.floor(Date.now() / 1000);
  if (Math.abs(nowUnix - Math.floor(timestamp)) > 300) {
    throw new Error("GOV04_AUTHORITY_EXPORT_SIGNATURE_STALE");
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${Math.floor(timestamp)}.${rawBody}`, "utf8")
    .digest("hex");
  if (!safeEqualHex(signature, expected)) {
    throw new Error("GOV04_AUTHORITY_EXPORT_SIGNATURE_INVALID");
  }
}

function parseSource(input: unknown): "api_internal" | "cli_local" | "cli_http" {
  const source = String(input || "").trim();
  if (source === "cli_local" || source === "cli_http") return source;
  return "api_internal";
}

export async function POST(request: Request) {
  if (request.method !== "POST") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405, headers: { allow: "POST" } });
  }

  if (!isAuthorityObserveEnabled(process.env)) {
    return NextResponse.json({ error: "Authority observe mode disabled" }, { status: 404 });
  }

  const rawBody = await request.text();

  try {
    verifySignature(rawBody, request.headers);
  } catch (error: any) {
    const code = String(error?.message || "GOV04_AUTHORITY_EXPORT_SIGNATURE_FAILED");
    if (code === "GOV04_AUTHORITY_EXPORT_JOB_SECRET_NOT_CONFIGURED") {
      return NextResponse.json({ error: "Authority export secret not configured", code }, { status: 500 });
    }
    return NextResponse.json({ error: "Authority export signature verification failed", code }, { status: 401 });
  }

  let payload: {
    source?: "api_internal" | "cli_local" | "cli_http";
    fromUtc?: string;
    toUtc?: string;
    limit?: number;
    tenantId?: string;
    policyId?: string;
  };

  try {
    payload = rawBody ? (JSON.parse(rawBody) as typeof payload) : {};
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  try {
    const report = await exportRunner({
      source: parseSource(payload?.source),
      fromUtc: payload?.fromUtc,
      toUtc: payload?.toUtc,
      limit: payload?.limit,
      tenantId: payload?.tenantId,
      policyId: payload?.policyId,
    });

    return NextResponse.json(report);
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Authority export failed",
        code: String(error?.message || "GOV04_AUTHORITY_EXPORT_FAILED"),
      },
      { status: 500 }
    );
  }
}
