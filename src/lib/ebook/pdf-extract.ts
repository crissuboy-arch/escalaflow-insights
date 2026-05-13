// Client-side PDF text extraction using pdfjs-dist.
// Runs in the browser to avoid Worker SSR compatibility issues.
import * as pdfjsLib from "pdfjs-dist";
// Vite worker import: bundles the worker so pdfjs can spawn it.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - vite ?worker import
import PdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?worker";

let workerSet = false;
function ensureWorker() {
  if (workerSet) return;
  try {
    // pdfjs v4+ accepts a worker port via workerPort
    (pdfjsLib as unknown as { GlobalWorkerOptions: { workerPort: Worker } })
      .GlobalWorkerOptions.workerPort = new PdfWorker();
  } catch {
    /* ignore */
  }
  workerSet = true;
}

export async function extractPdfText(
  file: File,
  opts: { maxPages?: number; maxChars?: number } = {},
): Promise<string> {
  ensureWorker();
  const maxPages = opts.maxPages ?? 50;
  const maxChars = opts.maxChars ?? 30_000;
  const buf = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
  const total = Math.min(doc.numPages, maxPages);
  const parts: string[] = [];
  let acc = 0;
  for (let i = 1; i <= total; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((it) => ("str" in it ? (it as { str: string }).str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (!pageText) continue;
    parts.push(pageText);
    acc += pageText.length;
    if (acc >= maxChars) break;
  }
  return parts.join("\n\n").slice(0, maxChars);
}