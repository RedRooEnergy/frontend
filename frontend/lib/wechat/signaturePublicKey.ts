import crypto from "crypto";
import { sha256Hex } from "./hash";

export type WeChatExportSignaturePublicKey = {
  keyId: string;
  algorithm: "RSA-SHA256";
  publicKeyPem: string;
  fingerprintSha256: string;
};

function parseBoolean(value: string | undefined) {
  return String(value || "").trim().toLowerCase() === "true";
}

export function resolveWeChatExportSignaturePublicKey(
  env: NodeJS.ProcessEnv = process.env
): WeChatExportSignaturePublicKey {
  const signatureEnabled = parseBoolean(env.WECHAT_EXPORT_SIGNATURE_ENABLED);
  if (!signatureEnabled) {
    throw new Error("WECHAT_EXPORT_SIGNATURE_DISABLED");
  }

  const keyId = String(env.WECHAT_EXPORT_SIGNATURE_KEY_ID || "").trim();
  if (!keyId) {
    throw new Error("WECHAT_EXPORT_SIGNATURE_INVALID: WECHAT_EXPORT_SIGNATURE_KEY_ID required");
  }

  const privateKeyPem = String(env.WECHAT_EXPORT_SIGNATURE_PRIVATE_KEY_PEM || "").trim();
  if (!privateKeyPem) {
    throw new Error("WECHAT_EXPORT_SIGNATURE_INVALID: WECHAT_EXPORT_SIGNATURE_PRIVATE_KEY_PEM required");
  }

  let privateKey: crypto.KeyObject;
  try {
    privateKey = crypto.createPrivateKey(privateKeyPem);
  } catch {
    throw new Error("WECHAT_EXPORT_SIGNATURE_INVALID: private key malformed");
  }
  if (privateKey.asymmetricKeyType !== "rsa") {
    throw new Error("WECHAT_EXPORT_SIGNATURE_INVALID: RSA key required");
  }

  const publicKey = crypto.createPublicKey(privateKey);
  const publicKeyPem = String(publicKey.export({ type: "spki", format: "pem" }));
  const publicKeyDer = Buffer.from(publicKey.export({ type: "spki", format: "der" }));

  return {
    keyId,
    algorithm: "RSA-SHA256",
    publicKeyPem,
    fingerprintSha256: sha256Hex(publicKeyDer),
  };
}
