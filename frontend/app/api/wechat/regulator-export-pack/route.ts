import { NextResponse } from "next/server";
import { requireRegulator } from "../../../../lib/auth/roleGuard";
import { resolveWeChatRuntimeConfig } from "../../../../lib/wechat/config";
import {
  appendWeChatRegulatorExportAuditEvent,
  countWeChatRegulatorExportAuditEventsInWindow,
} from "../../../../lib/wechat/exportAuditStore";
import { sha256Hex } from "../../../../lib/wechat/hash";
import {
  buildWeChatRegulatorExportFilename,
  buildWeChatRegulatorExportPack,
} from "../../../../lib/wechat/regulatorExportPack";

export const runtime = "nodejs";

function parsePositiveInt(value: string | null, fallback: number, max: number) {
  const parsed = Number(value || "");
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.floor(parsed), 1), max);
}

function parseBoolean(value: string | null, fallback: boolean) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return fallback;
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function firstHeaderValue(headers: Headers, ...keys: string[]) {
  for (const key of keys) {
    const value = String(headers.get(key) || "").trim();
    if (value) return value;
  }
  return "";
}

function hashOptionalValue(value: string, salt: string) {
  const normalized = String(value || "").trim();
  if (!normalized) return undefined;
  return sha256Hex(`${salt}|${normalized}`);
}

export async function GET(request: Request) {
  const regulator = requireRegulator(request.headers);
  if (!regulator) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const runtimeConfig = resolveWeChatRuntimeConfig();
  if (!runtimeConfig.flags.extensionEnabled) {
    return NextResponse.json({ error: "WeChat extension disabled" }, { status: 404 });
  }

  const url = new URL(request.url);
  const format = String(url.searchParams.get("format") || "zip").trim().toLowerCase();
  const bindingId = String(url.searchParams.get("bindingId") || "").trim() || undefined;
  const limit = parsePositiveInt(url.searchParams.get("limit"), 50, 200);
  const page = parsePositiveInt(url.searchParams.get("page"), 1, 10_000);
  const rateLimitEnabled = parseBoolean(process.env.WECHAT_EXPORT_RATE_LIMIT_ENABLED || null, true);
  const rateLimitMaxRequests = parsePositiveInt(process.env.WECHAT_EXPORT_RATE_LIMIT_MAX_REQUESTS || null, 30, 1000);
  const rateLimitWindowSeconds = parsePositiveInt(process.env.WECHAT_EXPORT_RATE_LIMIT_WINDOW_SECONDS || null, 300, 86_400);
  const exportSignatureEnabled = parseBoolean(process.env.WECHAT_EXPORT_SIGNATURE_ENABLED || null, false);
  const exportSignatureKeyId = String(process.env.WECHAT_EXPORT_SIGNATURE_KEY_ID || "").trim();
  const exportSignaturePrivateKeyPem = String(process.env.WECHAT_EXPORT_SIGNATURE_PRIVATE_KEY_PEM || "").trim();

  const auditSalt = String(process.env.WECHAT_EXPORT_AUDIT_SALT || "").trim();
  const routePath = "/api/wechat/regulator-export-pack";
  const requestedAt = new Date().toISOString();
  let remainingAfterCurrent = rateLimitMaxRequests;

  if (rateLimitEnabled) {
    let inWindowCount = 0;
    try {
      const windowResult = await countWeChatRegulatorExportAuditEventsInWindow({
        actorId: regulator.actorId,
        route: routePath,
        windowSeconds: rateLimitWindowSeconds,
        nowIso: requestedAt,
      });
      inWindowCount = windowResult.count;
    } catch {
      return NextResponse.json({ error: "Export rate-limit check unavailable" }, { status: 500 });
    }

    if (inWindowCount >= rateLimitMaxRequests) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          limit: rateLimitMaxRequests,
          windowSeconds: rateLimitWindowSeconds,
        },
        {
          status: 429,
          headers: {
            "retry-after": String(rateLimitWindowSeconds),
            "x-wechat-export-ratelimit-limit": String(rateLimitMaxRequests),
            "x-wechat-export-ratelimit-remaining": "0",
            "x-wechat-export-ratelimit-window": String(rateLimitWindowSeconds),
          },
        }
      );
    }

    remainingAfterCurrent = Math.max(0, rateLimitMaxRequests - (inWindowCount + 1));
  }

  if (exportSignatureEnabled && (!exportSignatureKeyId || !exportSignaturePrivateKeyPem)) {
    return NextResponse.json({ error: "Export signature configuration invalid" }, { status: 500 });
  }

  let pack;
  try {
    pack = await buildWeChatRegulatorExportPack({
      bindingId,
      limit,
      page,
      signature: {
        enabled: exportSignatureEnabled,
        keyId: exportSignatureKeyId,
        privateKeyPem: exportSignaturePrivateKeyPem,
      },
    });
  } catch {
    return NextResponse.json({ error: "Export pack generation failed" }, { status: 500 });
  }

  const forwardedFor = firstHeaderValue(request.headers, "x-forwarded-for", "x-real-ip");
  const clientIp = String(forwardedFor.split(",")[0] || "").trim();
  const userAgent = firstHeaderValue(request.headers, "user-agent");

  try {
    await appendWeChatRegulatorExportAuditEvent({
      actorId: regulator.actorId,
      format: format === "json" ? "json" : "zip",
      scope: {
        bindingId: bindingId || null,
        limit,
        page,
      },
      manifestSha256: pack.manifestSha256,
      canonicalHashSha256: pack.manifest.canonicalHashSha256,
      route: routePath,
      client: {
        ipHash: hashOptionalValue(clientIp, auditSalt),
        userAgentHash: hashOptionalValue(userAgent, auditSalt),
      },
    });
  } catch {
    return NextResponse.json({ error: "Export audit append failed" }, { status: 500 });
  }

  if (format === "json") {
    return NextResponse.json(
      {
        slice: pack.slice,
        manifest: pack.manifest,
        manifestSha256: pack.manifestSha256,
        manifestSignature: pack.manifestSignature || null,
      },
      {
        headers: {
          "x-wechat-export-ratelimit-limit": String(rateLimitMaxRequests),
          "x-wechat-export-ratelimit-remaining": String(remainingAfterCurrent),
          "x-wechat-export-ratelimit-window": String(rateLimitWindowSeconds),
          "x-wechat-export-signature-enabled": exportSignatureEnabled ? "1" : "0",
        },
      }
    );
  }

  const filename = buildWeChatRegulatorExportFilename(pack.slice.generatedAt);

  return new NextResponse(pack.zipBuffer as BodyInit, {
    status: 200,
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename=\"${filename}\"`,
      "cache-control": "no-store",
      "x-wechat-export-ratelimit-limit": String(rateLimitMaxRequests),
      "x-wechat-export-ratelimit-remaining": String(remainingAfterCurrent),
      "x-wechat-export-ratelimit-window": String(rateLimitWindowSeconds),
      "x-wechat-export-signature-enabled": exportSignatureEnabled ? "1" : "0",
    },
  });
}
