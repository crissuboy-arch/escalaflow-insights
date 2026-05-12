import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { PlannerContent } from "../planner.server";
import type { ProductIdentity } from "../ebook/niches";

const PAGE = { w: 595.28, h: 841.89 }; // A4

function wrap(t: string, font: PDFFont, size: number, max: number): string[] {
  const lines: string[] = [];
  for (const para of t.split("\n")) {
    if (!para.trim()) {
      lines.push("");
      continue;
    }
    const ws = para.split(/\s+/);
    let cur = "";
    for (const w of ws) {
      const test = cur ? `${cur} ${w}` : w;
      if (font.widthOfTextAtSize(test, size) <= max) cur = test;
      else {
        if (cur) lines.push(cur);
        cur = w;
      }
    }
    if (cur) lines.push(cur);
  }
  return lines;
}

export async function exportPlannerPdf(
  content: PlannerContent,
  identity?: ProductIdentity,
): Promise<Blob> {
  const pdf = await PDFDocument.create();
  const body = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const accent: [number, number, number] = [0.55, 0.4, 0.7];
  const margin = 56;

  // ---- Cover ----
  const cover = pdf.addPage([PAGE.w, PAGE.h]);
  cover.drawRectangle({ x: 0, y: 0, width: PAGE.w, height: PAGE.h, color: rgb(0.97, 0.94, 0.99) });
  cover.drawRectangle({ x: 0, y: PAGE.h - 8, width: PAGE.w, height: 8, color: rgb(...accent) });
  cover.drawText("PLANNER", { x: margin, y: PAGE.h - 140, size: 14, font: body, color: rgb(...accent) });
  const titleLines = wrap(content.title, bold, 36, PAGE.w - margin * 2);
  let yy = PAGE.h - 180;
  for (const ln of titleLines) {
    cover.drawText(ln, { x: margin, y: yy, size: 36, font: bold, color: rgb(0.1, 0.1, 0.15) });
    yy -= 44;
  }
  cover.drawText(content.motto, {
    x: margin,
    y: yy - 12,
    size: 14,
    font: body,
    color: rgb(0.35, 0.3, 0.45),
  });
  if (identity?.author) {
    cover.drawText(`por ${identity.author}`, {
      x: margin,
      y: 80,
      size: 12,
      font: body,
      color: rgb(0.4, 0.4, 0.45),
    });
  }

  // ---- Intro page ----
  let page: PDFPage = pdf.addPage([PAGE.w, PAGE.h]);
  let y = PAGE.h - margin;
  page.drawText("Como usar este planner", { x: margin, y, size: 22, font: bold, color: rgb(...accent) });
  y -= 36;
  for (const ln of wrap(content.intro, body, 12, PAGE.w - margin * 2)) {
    page.drawText(ln, { x: margin, y, size: 12, font: body, color: rgb(0.15, 0.15, 0.2) });
    y -= 18;
  }

  // ---- Trackers ----
  for (const tr of content.trackers) {
    page = pdf.addPage([PAGE.w, PAGE.h]);
    y = PAGE.h - margin;
    page.drawText(tr.name.toUpperCase(), { x: margin, y, size: 20, font: bold, color: rgb(...accent) });
    y -= 28;
    for (const ln of wrap(tr.description, body, 11, PAGE.w - margin * 2)) {
      page.drawText(ln, { x: margin, y, size: 11, font: body, color: rgb(0.4, 0.4, 0.45) });
      y -= 15;
    }
    y -= 14;
    // Grid: 2 colunas, ~12 linhas
    const colW = (PAGE.w - margin * 2 - 16) / 2;
    const rowH = 26;
    const startY = y;
    let col = 0;
    let row = 0;
    const items = [...tr.items];
    while (items.length < 14) items.push("");
    for (const item of items.slice(0, 14)) {
      const x = margin + col * (colW + 16);
      const ry = startY - row * rowH;
      // checkbox
      page.drawRectangle({
        x,
        y: ry - 14,
        width: 14,
        height: 14,
        borderColor: rgb(...accent),
        borderWidth: 1.2,
      });
      // line
      page.drawLine({
        start: { x: x + 22, y: ry - 14 },
        end: { x: x + colW, y: ry - 14 },
        color: rgb(0.85, 0.85, 0.9),
        thickness: 0.6,
      });
      if (item) {
        const text = item.length > 36 ? item.slice(0, 35) + "…" : item;
        page.drawText(text, { x: x + 22, y: ry - 11, size: 10, font: body, color: rgb(0.2, 0.2, 0.25) });
      }
      row++;
      if (row >= 7) {
        row = 0;
        col = 1;
      }
    }
  }

  // ---- Weekly prompts ----
  if (content.weeklyPrompts.length) {
    page = pdf.addPage([PAGE.w, PAGE.h]);
    y = PAGE.h - margin;
    page.drawText("Reflexão semanal", { x: margin, y, size: 22, font: bold, color: rgb(...accent) });
    y -= 36;
    for (const p of content.weeklyPrompts) {
      const lines = wrap(`• ${p}`, body, 12, PAGE.w - margin * 2);
      for (const ln of lines) {
        page.drawText(ln, { x: margin, y, size: 12, font: body, color: rgb(0.15, 0.15, 0.2) });
        y -= 18;
      }
      // 3 linhas em branco
      for (let i = 0; i < 3; i++) {
        page.drawLine({
          start: { x: margin, y: y - 4 },
          end: { x: PAGE.w - margin, y: y - 4 },
          color: rgb(0.85, 0.85, 0.9),
          thickness: 0.6,
        });
        y -= 22;
      }
      y -= 12;
    }
  }

  // page numbers
  pdf.getPages().forEach((p, i) => {
    if (i === 0) return;
    p.drawText(String(i), { x: PAGE.w - margin, y: 24, size: 9, font: body, color: rgb(0.5, 0.5, 0.55) });
  });

  const bytes = await pdf.save();
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}