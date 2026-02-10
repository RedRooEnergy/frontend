import fs from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

type ClauseIndexEntry = {
  title: string;
  pdfPage: number;
};

type ClauseIndex = Record<string, ClauseIndexEntry>;
type ClauseMarkers = Record<string, string[]>;

type StampOptions = {
  inputPath: string;
  outputPath: string;
  clauseIndexPath: string;
  clauseMarkersPath?: string;
  marginRight?: number;
  marginTop?: number;
  marginBottom?: number;
  fontSize?: number;
  lineHeight?: number;
};

function groupByPageFromIndex(clauseIndex: ClauseIndex) {
  const pageMap = new Map<number, string[]>();
  Object.entries(clauseIndex).forEach(([clauseId, entry]) => {
    const page = entry.pdfPage;
    if (!pageMap.has(page)) pageMap.set(page, []);
    pageMap.get(page)?.push(clauseId);
  });
  for (const [page, ids] of pageMap.entries()) {
    pageMap.set(page, ids.sort());
  }
  return pageMap;
}

function groupByPageFromMarkers(
  clauseMarkers: ClauseMarkers,
  clauseIndex: ClauseIndex
) {
  const pageMap = new Map<number, string[]>();
  Object.entries(clauseMarkers).forEach(([pageKey, clauseIds]) => {
    const page = Number(pageKey);
    if (!Number.isInteger(page)) {
      throw new Error(`Clause marker page "${pageKey}" is not a valid number.`);
    }
    if (!pageMap.has(page)) pageMap.set(page, []);
    clauseIds.forEach((clauseId) => {
      if (!clauseIndex[clauseId]) {
        throw new Error(`Clause marker references unknown clauseId: ${clauseId}`);
      }
      pageMap.get(page)?.push(clauseId);
    });
  });
  for (const [page, ids] of pageMap.entries()) {
    pageMap.set(page, ids.sort());
  }
  return pageMap;
}

export async function stampClauseMarkers(options: StampOptions) {
  const {
    inputPath,
    outputPath,
    clauseIndexPath,
    clauseMarkersPath,
    marginRight = 24,
    marginTop = 24,
    marginBottom = 24,
    fontSize = 8,
    lineHeight = 10,
  } = options;

  const [pdfBytes, clauseIndexRaw] = await Promise.all([
    fs.readFile(inputPath),
    fs.readFile(clauseIndexPath, "utf8"),
  ]);

  const clauseIndex = JSON.parse(clauseIndexRaw) as ClauseIndex;
  let clauseMarkers: ClauseMarkers | null = null;
  if (clauseMarkersPath) {
    try {
      const markersRaw = await fs.readFile(clauseMarkersPath, "utf8");
      clauseMarkers = JSON.parse(markersRaw) as ClauseMarkers;
    } catch (error) {
      clauseMarkers = null;
    }
  }

  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  const pageCount = pages.length;

  for (const [clauseId, entry] of Object.entries(clauseIndex)) {
    if (!Number.isInteger(entry.pdfPage) || entry.pdfPage < 1 || entry.pdfPage > pageCount) {
      throw new Error(
        `Clause ${clauseId} references invalid page ${entry.pdfPage}; PDF has ${pageCount} pages.`
      );
    }
  }

  const pageMap = clauseMarkers
    ? groupByPageFromMarkers(clauseMarkers, clauseIndex)
    : groupByPageFromIndex(clauseIndex);
  const font = await pdfDoc.embedFont(StandardFonts.Courier);

  pages.forEach((page, index) => {
    const pageNumber = index + 1;
    const clauseIds = pageMap.get(pageNumber);
    if (!clauseIds?.length) return;

    const { width, height } = page.getSize();
    clauseIds.forEach((clauseId, offsetIndex) => {
      const textWidth = font.widthOfTextAtSize(clauseId, fontSize);
      const x = Math.max(0, width - marginRight - textWidth);
      const y = height - marginTop - fontSize - offsetIndex * lineHeight;
      if (y < marginBottom) {
        throw new Error(
          `Not enough margin space to stamp ${clauseId} on page ${pageNumber}.`
        );
      }
      page.drawText(clauseId, {
        x,
        y,
        size: fontSize,
        font,
        color: rgb(0.35, 0.35, 0.35),
      });
    });
  });

  const stampedBytes = await pdfDoc.save();
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, stampedBytes);
}

async function runCli() {
  const argv = await yargs(hideBin(process.argv))
    .options({
      in: { type: "string", demandOption: true, describe: "Input base PDF path" },
      out: { type: "string", demandOption: true, describe: "Output stamped PDF path" },
      clauseIndex: { type: "string", demandOption: true, describe: "Clause index JSON path" },
    })
    .strict()
    .parse();

  await stampClauseMarkers({
    inputPath: argv.in,
    outputPath: argv.out,
    clauseIndexPath: argv.clauseIndex,
  });
}

if (process.argv[1] && process.argv[1].includes("stamp-clause-markers")) {
  runCli().catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  });
}
