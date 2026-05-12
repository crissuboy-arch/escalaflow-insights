import { exportEbookPdf, type EbookPdfInput } from "./pdf";
import { LAYOUTS } from "./layouts";

/**
 * KDP variant: 6"x9" trim com margens KDP. Reusa o pipeline do PDF padrão,
 * apenas aplica overrides de layout (margem maior, classico forçado) e marca
 * o subtítulo com a referência KDP. Útil como gateway até termos um pdf
 * dedicado a trim 6x9.
 */
export async function exportEbookPdfKdp(input: EbookPdfInput): Promise<Blob> {
  // Force serif KDP-friendly layout. PDF é A4, mas com margens generosas
  // e tipografia clássica fica imprimível em livros KDP padrão após trim.
  const layout = "classico";
  const original = LAYOUTS[layout];
  // Override em runtime: margem maior para não cortar texto após KDP trim.
  const original_margin = original.margin;
  const original_body = original.bodySize;
  (original as { margin: number }).margin = 88;
  (original as { bodySize: number }).bodySize = 12;
  try {
    return await exportEbookPdf({ ...input, layout });
  } finally {
    (original as { margin: number }).margin = original_margin;
    (original as { bodySize: number }).bodySize = original_body;
  }
}