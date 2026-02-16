import fs from "node:fs";
import path from "node:path";
import { PDFDocument, StandardFonts } from "pdf-lib";
import pdfParse from "pdf-parse";
import { stampClauseMarkers } from "../scripts/pdf/stamp-clause-markers";

const ROOT_DIR = path.resolve(process.cwd(), "..");
const CLAUSE_INDEX_PATH = path.join(
  ROOT_DIR,
  "docs",
  "extensions",
  "EXT-BUYER-01",
  "CLAUSE_INDEX.json"
);

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function createBasePdf(outputPath: string, pageCount: number) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < pageCount; i += 1) {
    const page = pdfDoc.addPage();
    page.drawText(`Base page ${i + 1}`, { x: 48, y: 760, size: 12, font });
  }
  const bytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, bytes);
}

async function run() {
  const clauseIndex = JSON.parse(fs.readFileSync(CLAUSE_INDEX_PATH, "utf8")) as Record<
    string,
    { title: string; pdfPage: number }
  >;
  const maxPage = Math.max(...Object.values(clauseIndex).map((entry) => entry.pdfPage));

  const tmpDir = path.join(process.cwd(), ".tmp", "pdf-stamp");
  fs.mkdirSync(tmpDir, { recursive: true });
  const basePath = path.join(tmpDir, "base.pdf");
  const stampedPath = path.join(tmpDir, "stamped.pdf");

  await createBasePdf(basePath, maxPage);

  await stampClauseMarkers({
    inputPath: basePath,
    outputPath: stampedPath,
    clauseIndexPath: CLAUSE_INDEX_PATH,
  });

  const baseDoc = await PDFDocument.load(fs.readFileSync(basePath));
  const stampedDoc = await PDFDocument.load(fs.readFileSync(stampedPath));
  assert(
    baseDoc.getPageCount() === stampedDoc.getPageCount(),
    "Stamped PDF page count must match base PDF."
  );

  const firstClauseId = Object.keys(clauseIndex)[0];
  const parsed = await pdfParse(fs.readFileSync(stampedPath));
  assert(
    parsed.text.includes(firstClauseId),
    `Stamped PDF does not include clause marker ${firstClauseId}.`
  );
}

run().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
