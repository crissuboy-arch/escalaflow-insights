import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";

export interface PlaybookSceneIn {
  title: string;
  text: string;
  image_url: string | null;
  balloons: string[];
  exercise: string;
  practical_action: string;
}

const PAGE = { w: 595.28, h: 841.89 };

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const para of text.split("\n")) {
    if (!para.trim()) { lines.push(""); continue; }
    const words = para.split(/\s+/);
    let cur = "";
    for (const w of words) {
      const tryLine = cur ? `${cur} ${w}` : w;
      if (font.widthOfTextAtSize(tryLine, size) <= maxWidth) cur = tryLine;
      else { if (cur) lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);
  }
  return lines;
}

async function fetchImageBytes(url: string): Promise<Uint8Array | null> {
  try {
    if (url.startsWith("data:")) {
      const b64 = url.split(",")[1] ?? "";
      const bin = atob(b64);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      return arr;
    }
    const res = await fetch(url);
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  } catch {
    return null;
  }
}

export async function exportPlaybookPdf(title: string, scenes: PlaybookSceneIn[]) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const margin = 56;
  const contentW = PAGE.w - margin * 2;

  // Cover
  let page = doc.addPage([PAGE.w, PAGE.h]);
  page.drawRectangle({ x: 0, y: 0, width: PAGE.w, height: PAGE.h, color: rgb(0.06, 0.06, 0.12) });
  page.drawText(title, { x: margin, y: PAGE.h - 200, size: 32, font: bold, color: rgb(0.95, 0.95, 1), maxWidth: contentW });
  page.drawText("Playbook interativo", { x: margin, y: PAGE.h - 240, size: 14, font, color: rgb(0.7, 0.7, 0.9) });

  for (let si = 0; si < scenes.length; si++) {
    const s = scenes[si];
    page = doc.addPage([PAGE.w, PAGE.h]);
    let y = PAGE.h - margin;

    if (s.image_url) {
      const bytes = await fetchImageBytes(s.image_url);
      if (bytes) {
        try {
          const img = s.image_url.includes("png") || s.image_url.startsWith("data:image/png")
            ? await doc.embedPng(bytes)
            : await doc.embedJpg(bytes);
          const ratio = img.height / img.width;
          const w = contentW;
          const h = Math.min(w * ratio, 240);
          page.drawImage(img, { x: margin, y: y - h, width: w, height: h });
          y -= h + 16;
        } catch {}
      }
    }

    page.drawText(`Cena ${si + 1}`, { x: margin, y, size: 9, font, color: rgb(0.5, 0.5, 0.7) });
    y -= 14;
    const titleLines = wrap(s.title, bold, 22, contentW);
    for (const line of titleLines) {
      page.drawText(line, { x: margin, y, size: 22, font: bold, color: rgb(0.1, 0.1, 0.15) });
      y -= 26;
    }
    y -= 8;

    const bodyLines = wrap(s.text, font, 11, contentW);
    for (const line of bodyLines) {
      if (y < margin + 40) { page = doc.addPage([PAGE.w, PAGE.h]); y = PAGE.h - margin; }
      page.drawText(line, { x: margin, y, size: 11, font, color: rgb(0.15, 0.15, 0.2) });
      y -= 15;
    }

    if (s.balloons.length) {
      y -= 10;
      for (const b of s.balloons) {
        const lines = wrap(`★ ${b}`, font, 10, contentW - 12);
        for (const line of lines) {
          if (y < margin + 30) { page = doc.addPage([PAGE.w, PAGE.h]); y = PAGE.h - margin; }
          page.drawText(line, { x: margin + 10, y, size: 10, font, color: rgb(0.55, 0.4, 0.05) });
          y -= 14;
        }
      }
    }

    if (s.exercise || s.practical_action) {
      y -= 14;
      if (y < margin + 60) { page = doc.addPage([PAGE.w, PAGE.h]); y = PAGE.h - margin; }
      page.drawText("Sobre esta etapa", { x: margin, y, size: 11, font: bold, color: rgb(0.2, 0.3, 0.6) });
      y -= 16;
      if (s.exercise) {
        for (const l of wrap(`Exercício: ${s.exercise}`, font, 10, contentW)) {
          if (y < margin + 20) { page = doc.addPage([PAGE.w, PAGE.h]); y = PAGE.h - margin; }
          page.drawText(l, { x: margin, y, size: 10, font, color: rgb(0.2, 0.2, 0.25) });
          y -= 13;
        }
      }
      if (s.practical_action) {
        for (const l of wrap(`Ação prática: ${s.practical_action}`, font, 10, contentW)) {
          if (y < margin + 20) { page = doc.addPage([PAGE.w, PAGE.h]); y = PAGE.h - margin; }
          page.drawText(l, { x: margin, y, size: 10, font, color: rgb(0.2, 0.2, 0.25) });
          y -= 13;
        }
      }
    }
  }

  const bytes = await doc.save();
  const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}