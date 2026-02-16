import { NextResponse } from "next/server";
import { requireRegulator } from "../../../../lib/auth/roleGuard";
import { resolveWeChatRuntimeConfig } from "../../../../lib/wechat/config";
import { resolveWeChatExportSignaturePublicKey } from "../../../../lib/wechat/signaturePublicKey";

export const runtime = "nodejs";

function isEnabled(value: string | undefined) {
  return String(value || "").trim().toLowerCase() === "true";
}

export async function GET(request: Request) {
  const regulator = requireRegulator(request.headers);
  if (!regulator) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const runtimeConfig = resolveWeChatRuntimeConfig();
  if (!runtimeConfig.flags.extensionEnabled) {
    return NextResponse.json({ error: "WeChat extension disabled" }, { status: 404 });
  }

  if (!isEnabled(process.env.WECHAT_EXPORT_SIGNATURE_ENABLED)) {
    return NextResponse.json({ error: "WeChat export signature disabled" }, { status: 404 });
  }

  try {
    const signaturePublicKey = resolveWeChatExportSignaturePublicKey();
    return NextResponse.json(
      {
        keyId: signaturePublicKey.keyId,
        algorithm: signaturePublicKey.algorithm,
        publicKeyPem: signaturePublicKey.publicKeyPem,
        fingerprintSha256: signaturePublicKey.fingerprintSha256,
        generatedAt: new Date().toISOString(),
      },
      {
        headers: {
          "cache-control": "no-store",
        },
      }
    );
  } catch (error) {
    const message = String((error as Error)?.message || "");
    if (message === "WECHAT_EXPORT_SIGNATURE_DISABLED") {
      return NextResponse.json({ error: "WeChat export signature disabled" }, { status: 404 });
    }
    return NextResponse.json({ error: "Public key unavailable" }, { status: 500 });
  }
}
