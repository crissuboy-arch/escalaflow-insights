// Client-side PDF export for the Scale module result.
// Renders one or more DOM elements into a multi-page A4 PDF using
// html2canvas + jsPDF. Pure client code — no server function needed.
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

export async function exportElementToPdf(
  el: HTMLElement,
  filename: string,
): Promise<void> {
  // Force a stable width to keep the rasterisation predictable across viewports.
  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#0a0a0f",
    logging: false,
    windowWidth: 1280,
  });

  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  const imgData = canvas.toDataURL("image/jpeg", 0.85);
  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position -= pageHeight;
    pdf.addPage();
    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(filename);
}
