import { exportEbookPdf, type EbookPdfInput } from "./pdf";

/** KDP variant: 6"x9" trim with KDP-grade frontmatter and editorial typography. */
export async function exportEbookPdfKdp(input: EbookPdfInput): Promise<Blob> {
  return exportEbookPdf({ ...input, renderMode: "kdp" });
}
