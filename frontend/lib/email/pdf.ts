import crypto from "crypto";

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function generatePdfFromLines(lines: string[]) {
  const sanitized = lines.map((line) => escapePdfText(line));
  const textOps = sanitized
    .map((line, idx) => `${idx === 0 ? "" : "0 -14 Td "}${line ? `(${line}) Tj` : ""}`.trim())
    .filter(Boolean)
    .join("\n");

  const contentStream = `BT\n/F1 10 Tf\n50 750 Td\n${textOps}\nET\n`;
  const contentLength = Buffer.byteLength(contentStream, "utf8");

  const objects: string[] = [];
  objects.push("1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n");
  objects.push("2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n");
  objects.push(
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj\n"
  );
  objects.push("4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n");
  objects.push(`5 0 obj << /Length ${contentLength} >>\nstream\n${contentStream}endstream\nendobj\n`);

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((obj) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += obj;
  });

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  const buffer = Buffer.from(pdf, "utf8");
  const hash = crypto.createHash("sha256").update(buffer).digest("hex");
  return { buffer, hash };
}
