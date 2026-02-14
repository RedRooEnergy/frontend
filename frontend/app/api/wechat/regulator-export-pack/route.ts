import { NextResponse } from "next/server";
import { requireRegulator } from "../../../../../lib/auth/roleGuard";
import { resolveWeChatRuntimeConfig } from "../../../../../lib/wechat/config";
import { appendWeChatRegulatorExportAuditEvent } from "../../../../../lib/wechat/exportAuditStore";
import { sha256Hex } from "../../../../../lib/wechat/hash";
import {
  buildWeChatRegulatorExportFilename,
  buildWeChatRegulatorExportPack,
} from "../../../../../lib/wechat/regulatorExportPack";

export const runtime = "nodejs";

function parsePositiveInt(value: string | null, fallback: number, max: number) {
  const parsed = Number(value || "");
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.floor(parsed), 1), max);
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
  const auditSalt = String(process.env.WECHAT_EXPORT_AUDIT_SALT || "").trim();

  const pack = await buildWeChatRegulatorExportPack({
    bindingId,
    limit,
    page,
  });

  const forwardedFor = firstHeaderValue(request.headers, "x-forwarded-for", "x-real-ip");
  const clientIp = String(forwardedFor.split(",")[0] || "").trim();
  const userAgent = firstHeaderValue(request.headers, "user-agent");
  const requestedAt = new Date().toISOString();

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
      route: "/api/wechat/regulator-export-pack",
      requestedAt,
      client: {
        ipHash: hashOptionalValue(clientIp, auditSalt),
        userAgentHash: hashOptionalValue(userAgent, auditSalt),
      },
    });
  } catch {
    return NextResponse.json({ error: "Export audit append failed" }, { status: 500 });
  }

  if (format === "json") {
    return NextResponse.json({
      slice: pack.slice,
      manifest: pack.manifest,
      manifestSha256: pack.manifestSha256,
    });
  }

  const filename = buildWeChatRegulatorExportFilename(pack.slice.generatedAt);

  return new NextResponse(pack.zipBuffer as BodyInit, {
    status: 200,
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename=\"${filename}\"`,
      "cache-control": "no-store",
    },
  });
}
