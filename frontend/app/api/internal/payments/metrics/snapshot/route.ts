import "../../../../../../lib/payments/bootstrap";

import crypto from "crypto";
import { NextResponse } from "next/server";
import { resolvePaymentsRuntimeConfig } from "../../../../../../lib/payments/config";
import { getPaymentsMetricsSnapshotRunner } from "../../../../../../lib/internal/paymentsMetricsSnapshotTestHooks";
import type { MetricsSource } from "../../../../../../lib/payments/metrics/types";

function safeEqualHex(left: string, right: string) {
  const leftBuf = Buffer.from(String(left || ""), "utf8");
  const rightBuf = Buffer.from(String(right || ""), "utf8");
  if (leftBuf.length !== rightBuf.length) return false;
  return crypto.timingSafeEqual(leftBuf, rightBuf);
}

function verifyMetricsJobSignature(rawBody: string, headers: Headers) {
  const secret = String(process.env.PAYMENTS_METRICS_JOB_SECRET || "").trim();
  if (!secret) {
    throw new Error("PAYMENTS_METRICS_JOB_SECRET_NOT_CONFIGURED");
  }

  const signature = String(headers.get("x-rre-job-signature") || "").trim();
  const timestampRaw = String(headers.get("x-rre-job-timestamp") || "").trim();
  const timestamp = Number(timestampRaw);

  if (!signature || !Number.isFinite(timestamp) || timestamp <= 0) {
    throw new Error("PAYMENTS_METRICS_SIGNATURE_HEADER_INVALID");
  }

  const nowUnix = Math.floor(Date.now() / 1000);
  if (Math.abs(nowUnix - Math.floor(timestamp)) > 300) {
    throw new Error("PAYMENTS_METRICS_SIGNATURE_STALE");
  }

  const expected = crypto.createHmac("sha256", secret).update(`${Math.floor(timestamp)}.${rawBody}`, "utf8").digest("hex");
  if (!safeEqualHex(signature, expected)) {
    throw new Error("PAYMENTS_METRICS_SIGNATURE_INVALID");
  }
}

function parseSource(input: unknown): MetricsSource {
  const source = String(input || "").trim();
  if (source === "cli_local" || source === "cli_http") {
    return source;
  }
  return "api_internal";
}

export async function POST(request: Request) {
  if (request.method !== "POST") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405, headers: { allow: "POST" } });
  }

  const runtimeConfig = resolvePaymentsRuntimeConfig();
  if (!runtimeConfig.flags.metricsEnabled || !runtimeConfig.flags.metricsRouteEnabled) {
    return NextResponse.json({ error: "Payments metrics route disabled" }, { status: 404 });
  }

  const rawBody = await request.text();

  try {
    verifyMetricsJobSignature(rawBody, request.headers);
  } catch (error: any) {
    const code = String(error?.message || "PAYMENTS_METRICS_SIGNATURE_FAILED");
    if (code === "PAYMENTS_METRICS_JOB_SECRET_NOT_CONFIGURED") {
      return NextResponse.json(
        {
          error: "Payments metrics job secret not configured",
          code,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: "Payments metrics signature verification failed",
        code,
      },
      { status: 401 }
    );
  }

  let payload: {
    source?: MetricsSource;
    fromUtc?: string;
    toUtc?: string;
    limit?: number;
  };

  try {
    payload = rawBody ? (JSON.parse(rawBody) as typeof payload) : {};
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  try {
    const report = await getPaymentsMetricsSnapshotRunner()({
      source: parseSource(payload?.source),
      fromUtc: payload?.fromUtc,
      toUtc: payload?.toUtc,
      limit: payload?.limit,
    });

    return NextResponse.json(report);
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Payments metrics snapshot failed",
        code: String(error?.message || "PAYMENTS_METRICS_SNAPSHOT_FAILED"),
      },
      { status: 500 }
    );
  }
}
