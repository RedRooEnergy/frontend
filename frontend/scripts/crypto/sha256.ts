import fs from "node:fs";
import crypto from "node:crypto";

export function sha256Buffer(buffer: Buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export function sha256String(value: string) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

export function sha256File(filePath: string) {
  const data = fs.readFileSync(filePath);
  return sha256Buffer(data);
}
