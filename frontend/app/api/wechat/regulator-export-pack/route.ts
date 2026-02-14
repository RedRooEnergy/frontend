import { NextResponse } from "next/server";
import { requireRegulator } from "../../../../../lib/auth/roleGuard";
import { resolveWeChatRuntimeConfig } from "../../../../../lib/wechat/config";
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

  const pack = await buildWeChatRegulatorExportPack({
    bindingId,
    limit,
    page,
  });

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
