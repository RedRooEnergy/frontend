import crypto from "crypto";
import path from "path";

const MAX_FILE_SIZE = 20 * 1024 * 1024;

const ALLOWED_EXTENSIONS = ["pdf", "doc", "docx", "pages", "rtf", "txt"];
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.apple.pages",
  "application/rtf",
  "text/plain",
];

export type StorageDriver = "local" | "s3";

export interface PresignRequest {
  fileName: string;
  fileType?: string;
  fileSize: number;
  kind: string;
}

export interface PresignResponse {
  uploadUrl: string;
  method: "PUT";
  headers: Record<string, string>;
  storageKey: string;
  url?: string;
}

export interface StorageConfig {
  driver: StorageDriver;
  bucket?: string;
  region?: string;
  accessKey?: string;
  secretKey?: string;
  endpoint?: string;
  publicBaseUrl?: string;
  forcePathStyle?: boolean;
}

export function getStorageConfig(): StorageConfig {
  return {
    driver: (process.env.CAREERS_STORAGE_DRIVER as StorageDriver) || "local",
    bucket: process.env.CAREERS_S3_BUCKET,
    region: process.env.CAREERS_S3_REGION || "ap-southeast-2",
    accessKey: process.env.CAREERS_S3_ACCESS_KEY,
    secretKey: process.env.CAREERS_S3_SECRET_KEY,
    endpoint: process.env.CAREERS_S3_ENDPOINT,
    publicBaseUrl: process.env.CAREERS_S3_PUBLIC_BASE_URL,
    forcePathStyle: process.env.CAREERS_S3_FORCE_PATH_STYLE === "true",
  };
}

export function validateUpload({ fileName, fileType, fileSize }: PresignRequest) {
  if (!fileName) throw new Error("File name required");
  if (fileSize <= 0 || fileSize > MAX_FILE_SIZE) throw new Error("File size exceeds 20MB");
  const ext = path.extname(fileName).replace(".", "").toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) throw new Error("File type not allowed");
  if (fileType && !ALLOWED_MIME_TYPES.includes(fileType)) {
    // Accept unknown MIME types if extension is valid.
  }
  return { ext };
}

function encodeRFC3986(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function toAmzDate(date = new Date()) {
  const iso = date.toISOString().replace(/[:-]|\.\d{3}/g, "");
  return { amzDate: iso, dateStamp: iso.slice(0, 8) };
}

function sign(key: Buffer | string, msg: string) {
  return crypto.createHmac("sha256", key).update(msg, "utf8").digest();
}

function getSignatureKey(key: string, dateStamp: string, region: string, service: string) {
  const kDate = sign(`AWS4${key}`, dateStamp);
  const kRegion = sign(kDate, region);
  const kService = sign(kRegion, service);
  return sign(kService, "aws4_request");
}

function buildBaseUrl(config: StorageConfig, key: string) {
  const bucket = config.bucket!;
  const region = config.region!;
  const endpoint = config.endpoint || `https://s3.${region}.amazonaws.com`;
  const url = new URL(endpoint);
  const pathnameBase = url.pathname.replace(/\/$/, "");
  let host = url.host;
  let pathStyle = config.forcePathStyle === true;
  if (!pathStyle) {
    if (!host.startsWith(`${bucket}.`)) host = `${bucket}.${host}`;
  }
  const canonicalUri = pathStyle ? `${pathnameBase}/${bucket}/${key}` : `${pathnameBase}/${key}`;
  const requestUrl = `${url.protocol}//${host}${canonicalUri}`;
  return { requestUrl, host, canonicalUri };
}

function presignS3Url(config: StorageConfig, key: string, method: "PUT" | "GET", expiresIn = 900) {
  if (!config.bucket || !config.region || !config.accessKey || !config.secretKey) {
    throw new Error("S3 storage not configured");
  }
  const { amzDate, dateStamp } = toAmzDate();
  const service = "s3";
  const credentialScope = `${dateStamp}/${config.region}/${service}/aws4_request`;
  const { requestUrl, host, canonicalUri } = buildBaseUrl(config, key);
  const query: Record<string, string> = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${config.accessKey}/${credentialScope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": `${expiresIn}`,
    "X-Amz-SignedHeaders": "host",
  };
  const sortedQuery = Object.keys(query)
    .sort()
    .map((k) => `${encodeRFC3986(k)}=${encodeRFC3986(query[k])}`)
    .join("&");

  const canonicalHeaders = `host:${host}\n`;
  const signedHeaders = "host";
  const payloadHash = "UNSIGNED-PAYLOAD";
  const canonicalRequest = [method, canonicalUri, sortedQuery, canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    crypto.createHash("sha256").update(canonicalRequest, "utf8").digest("hex"),
  ].join("\n");
  const signingKey = getSignatureKey(config.secretKey, dateStamp, config.region, service);
  const signature = crypto.createHmac("sha256", signingKey).update(stringToSign, "utf8").digest("hex");
  const signedUrl = `${requestUrl}?${sortedQuery}&X-Amz-Signature=${signature}`;
  return signedUrl;
}

export function createStorageKey(kind: string, fileName: string) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `careers/${kind}/${crypto.randomUUID()}_${safeName}`;
}

export function presignUpload(req: PresignRequest): PresignResponse {
  validateUpload(req);
  const config = getStorageConfig();
  const storageKey = createStorageKey(req.kind, req.fileName);
  if (config.driver === "local") {
    const uploadUrl = `/api/careers/uploads/local?key=${encodeRFC3986(storageKey)}`;
    return {
      uploadUrl,
      method: "PUT",
      headers: { "Content-Type": req.fileType || "application/octet-stream" },
      storageKey,
      url: `/uploads/${storageKey}`,
    };
  }
  const uploadUrl = presignS3Url(config, storageKey, "PUT");
  const publicBase = config.publicBaseUrl || (config.endpoint ? new URL(config.endpoint).origin : undefined);
  const url = publicBase ? `${publicBase}/${storageKey}` : undefined;
  return {
    uploadUrl,
    method: "PUT",
    headers: { "Content-Type": req.fileType || "application/octet-stream" },
    storageKey,
    url,
  };
}

export function getDownloadUrl(storageKey: string) {
  const config = getStorageConfig();
  if (config.driver === "local") {
    return `/uploads/${storageKey}`;
  }
  return presignS3Url(config, storageKey, "GET", 600);
}

