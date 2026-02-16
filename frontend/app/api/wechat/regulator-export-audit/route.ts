import { NextResponse } from "next/server";
import { requireRegulator } from "../../../../lib/auth/roleGuard";
import { resolveWeChatRuntimeConfig } from "../../../../lib/wechat/config";
import { listWeChatRegulatorExportAuditEvents } from "../../../../lib/wechat/exportAuditStore";

export const runtime = "nodejs";

function parsePositiveInt(value: string | null, fallback: number, max: number) {
  const parsed = Number(value || "");
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.floor(parsed), 1), max);
}

function maskId(id: string) {
  const normalized = String(id || "").trim();
  if (!normalized) return "";
  return `****${normalized.slice(-4)}`;
}

export async function GET(request: Request) {
  const regulator = requireRegulator(request.headers);
  if (!regulator) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const runtimeConfig = resolveWeChatRuntimeConfig();
  if (!runtimeConfig.flags.extensionEnabled) {
    return NextResponse.json({ error: "WeChat extension disabled" }, { status: 404 });
  }

  const url = new URL(request.url);
  const limit = parsePositiveInt(url.searchParams.get("limit"), 50, 200);
  const page = parsePositiveInt(url.searchParams.get("page"), 1, 10_000);
  const manifestSha256 = String(url.searchParams.get("manifestSha256") || "").trim() || undefined;

  const result = await listWeChatRegulatorExportAuditEvents({
    limit,
    page,
    manifestSha256,
  });

  return NextResponse.json({
    items: result.items.map((row) => ({
      eventIdMasked: maskId(row.eventId),
      requestedAt: row.requestedAt,
      format: row.format,
      scope: row.scope,
      manifestSha256: row.manifestSha256,
      canonicalHashSha256: row.canonicalHashSha256,
    })),
    paging: {
      limit: result.limit,
      page: result.page,
      total: result.total,
    },
    generatedAt: new Date().toISOString(),
  });
}
