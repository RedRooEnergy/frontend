import crypto from "crypto";
import { NextResponse } from "next/server";
import { getAuthorityShadowMetricsRunner } from "../../../../../../../lib/internal/authorityShadowMetricsTestHooks";

function parseBoolean(value: string | undefined) {
  return String(value || "").trim().toLowerCase() === "true";
}

function isRouteEnabled(env: NodeJS.ProcessEnv = process.env) {
  return (
    parseBoolean(env.ENABLE_GOV04_AUTHORITY_SHADOW_METRICS_ROUTE) &&
    parseBoolean(env.ENABLE_GOV04_AUTHORITY_SHADOW_METRICS) &&
    parseBoolean(env.ENABLE_GOV04_AUTHORITY_SHADOW)
  );
}

function safeEqualHex(left: string, right: string) {
  const leftBuf = Buffer.from(String(left || ""), "utf8");
  const rightBuf = Buffer.from(String(right || ""), "utf8");
  if (leftBuf.length !== rightBuf.length) return false;
  return crypto.timingSafeEqual(leftBuf, rightBuf);
}

function verifySignature(rawBody: string, headers: Headers) {
  const secret = String(process.env.GOV04_AUTHORITY_SHADOW_METRICS_JOB_SECRET || "").trim();
  if (!secret) {
    throw new Error("GOV04_AUTHORITY_SHADOW_METRICS_JOB_SECRET_NOT_CONFIGURED");
  }

  const signature = String(headers.get("x-rre-job-signature") || "").trim();
  const timestampRaw = String(headers.get("x-rre-job-timestamp") || "").trim();
  const timestamp = Number(timestampRaw);

  if (!signature || !Number.isFinite(timestamp) || timestamp <= 0) {
    throw new Error("GOV04_AUTHORITY_SHADOW_METRICS_SIGNATURE_HEADER_INVALID");
  }

  const nowUnix = Math.floor(Date.now() / 1000);
  if (Math.abs(nowUnix - Math.floor(timestamp)) > 300) {
    throw new Error("GOV04_AUTHORITY_SHADOW_METRICS_SIGNATURE_STALE");
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${Math.floor(timestamp)}.${rawBody}`, "utf8")
    .digest("hex");

  if (!safeEqualHex(signature, expected)) {
    throw new Error("GOV04_AUTHORITY_SHADOW_METRICS_SIGNATURE_INVALID");
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

  if (!isRouteEnabled(process.env)) {
    return NextResponse.json({ error: "Authority shadow metrics route disabled" }, { status: 404 });
  }

  const rawBody = await request.text();

  try {
    verifySignature(rawBody, request.headers);
  } catch (error: any) {
    const code = String(error?.message || "GOV04_AUTHORITY_SHADOW_METRICS_SIGNATURE_FAILED");
    if (code === "GOV04_AUTHORITY_SHADOW_METRICS_JOB_SECRET_NOT_CONFIGURED") {
      return NextResponse.json({ error: "Authority shadow metrics secret not configured", code }, { status: 500 });
    }
    return NextResponse.json({ error: "Authority shadow metrics signature verification failed", code }, { status: 401 });
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
    const report = await getAuthorityShadowMetricsRunner()({
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
        error: "Authority shadow metrics snapshot failed",
        code: String(error?.message || "GOV04_AUTHORITY_SHADOW_METRICS_FAILED"),
      },
      { status: 500 }
    );
  }
}
