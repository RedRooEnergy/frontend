import crypto from "crypto";
import { listEmailDispatches } from "./store";
import { generatePdfFromLines } from "./pdf";

function sha256(input: string | Buffer) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function exportEmailAudit(input: { startDate?: string; endDate?: string } = {}) {
  const { items } = await listEmailDispatches({
    startDate: input.startDate,
    endDate: input.endDate,
    limit: 2000,
  });

  const json = items;
  const jsonString = JSON.stringify(json, null, 2);
  const jsonHash = sha256(jsonString);

  const lines = [
    "RRE Email Audit Export",
    `Generated: ${new Date().toISOString()}`,
    `Records: ${items.length}`,
    "",
    ...items.slice(0, 200).map((d) => `Dispatch ${d.dispatchId} | ${d.eventCode} | ${d.recipientRole} | ${d.sendStatus}`),
    items.length > 200 ? "... truncated ..." : "",
  ];
  const pdf = generatePdfFromLines(lines);

  const manifest = {
    generatedAt: new Date().toISOString(),
    recordCount: items.length,
    items: [
      { type: "JSON", name: "email_audit.json", sha256: jsonHash, bytes: Buffer.byteLength(jsonString, "utf8") },
      { type: "PDF", name: "email_audit.pdf", sha256: pdf.hash, bytes: pdf.buffer.length },
    ],
  };
  const manifestHash = sha256(JSON.stringify(manifest));

  return { json, jsonHash, pdf, manifest, manifestHash };
}
