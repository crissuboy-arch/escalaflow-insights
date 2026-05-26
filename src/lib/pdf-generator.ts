import { jsPDF } from "jspdf";
import type { TemplateMaster } from "@/lib/ebook/template-master";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DesignConfig {
  colorA: string;
  colorB: string;
  font: "sans" | "serif";
}

export interface PdfChapter {
  id: string;
  title: string;
  badge?: string;
  body: string;
  checklist?: string[];
  exercise?: string;
  pullQuote?: string;
  images?: { dataUrl: string; aspectRatio: number }[];
}

export interface PdfState {
  title: string;
  subtitle: string;
  author: string;
  coverUrl: string;
  chapters: PdfChapter[];
  bonus?: { title: string; description: string; items: string[] };
  cta: { headline: string; body: string; buttonText: string; urgency: string };
  finalPage: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hex2rgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function lighten(rgb: [number, number, number], factor: number): [number, number, number] {
  return [
    Math.round(rgb[0] + (255 - rgb[0]) * factor),
    Math.round(rgb[1] + (255 - rgb[1]) * factor),
    Math.round(rgb[2] + (255 - rgb[2]) * factor),
  ];
}

// ─── Main generator ───────────────────────────────────────────────────────────

export async function generateEbookPDF(
  state: PdfState,
  template: TemplateMaster,
  design?: Partial<DesignConfig>,
): Promise<void> {
  const config: DesignConfig = {
    colorA: design?.colorA ?? template.colorA,
    colorB: design?.colorB ?? template.colorB,
    font: design?.font ?? "sans",
  };

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const W = 210;
  const H = 297;
  const ML = 20;
  const MR = 20;
  const TW = W - ML - MR;
  const MB = 20;

  const ca = hex2rgb(config.colorA);
  const cb = hex2rgb(config.colorB);
  const caLight = lighten(ca, 0.92);
  const bodyFont = config.font === "serif" ? "times" : "helvetica";

  // Current Y position tracker (mutable, captured by closures below)
  const page = { y: 28, num: 1 };

  function footerCurrent() {
    const saved = doc.getFontSize();
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(180, 180, 180);
    doc.text(state.title.substring(0, 50), ML, H - 11);
    doc.text(String(page.num), W - MR, H - 11, { align: "right" });
    doc.setFontSize(saved);
  }

  function newPage() {
    page.num++;
    doc.addPage();
    page.y = 28;
    // header rule
    doc.setDrawColor(...ca);
    doc.setLineWidth(0.25);
    doc.line(ML, 18, W - MR, 18);
    footerCurrent();
  }

  function checkSpace(needed: number) {
    if (page.y + needed > H - MB - 5) newPage();
  }

  function lineH(ptSize: number, leading = 1.45): number {
    return ptSize * 0.352778 * leading;
  }

  function addParagraph(
    text: string,
    opts: {
      font?: string;
      style?: "normal" | "bold" | "italic" | "bolditalic";
      size?: number;
      color?: [number, number, number];
      indent?: number;
      spaceBefore?: number;
      spaceAfter?: number;
      align?: "left" | "center" | "right";
      maxWidth?: number;
    } = {},
  ) {
    const {
      font = bodyFont,
      style = "normal",
      size = 10.5,
      color = [50, 50, 50],
      indent = 0,
      spaceBefore = 0,
      spaceAfter = 2,
      align = "left",
      maxWidth,
    } = opts;

    const lh = lineH(size);
    const tw = (maxWidth ?? TW) - indent;
    const x = ML + indent;

    if (spaceBefore > 0) {
      checkSpace(spaceBefore);
      page.y += spaceBefore;
    }

    doc.setFont(font, style);
    doc.setFontSize(size);
    doc.setTextColor(...color);

    const lines = doc.splitTextToSize(text, tw);
    for (const ln of lines) {
      checkSpace(lh + 1);
      if (align === "center") doc.text(ln, W / 2, page.y, { align: "center" });
      else if (align === "right") doc.text(ln, W - MR, page.y, { align: "right" });
      else doc.text(ln, x, page.y);
      page.y += lh;
    }

    if (spaceAfter > 0) page.y += spaceAfter;
  }

  // ── COVER ──────────────────────────────────────────────────────────────────

  // Background: top half colorA, bottom half colorB
  doc.setFillColor(...ca);
  doc.rect(0, 0, W, H * 0.58, "F");
  doc.setFillColor(...cb);
  doc.rect(0, H * 0.58, W, H * 0.42, "F");

  // Cover image (if present, overlay full page)
  if (state.coverUrl && (state.coverUrl.startsWith("data:image/") || state.coverUrl.startsWith("data:application/"))) {
    try {
      const imgFmt = state.coverUrl.includes("image/png") ? "PNG" : "JPEG";
      doc.addImage(state.coverUrl, imgFmt, 0, 0, W, H);
      // Dark overlay on bottom 35% for text readability
      doc.setFillColor(...cb);
      // Semi-simulate opacity: draw semi-transparent rectangle by layering
      for (let op = 0; op < 5; op++) {
        doc.setFillColor(cb[0], cb[1], cb[2]);
        doc.rect(0, H * 0.62, W, H * 0.38, "F");
      }
    } catch {
      // If image fails, keep the color background
    }
  }

  // Thin top accent bar
  doc.setFillColor(...cb);
  doc.rect(0, 0, W, 8, "F");

  // Emoji (text approximation - large font)
  if (!state.coverUrl && template.emoji) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(0.1); // minimal to avoid crashes with emoji
  }

  // Title
  doc.setFont("times", "bold");
  doc.setFontSize(26);
  doc.setTextColor(255, 255, 255);
  const titleLines = doc.splitTextToSize(state.title, TW);
  let cy = state.coverUrl ? H * 0.66 : 90;
  for (const ln of titleLines) {
    doc.text(ln, W / 2, cy, { align: "center" });
    cy += 11.5;
  }

  // Short rule
  cy += 3;
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.4);
  doc.line(W / 2 - 18, cy, W / 2 + 18, cy);
  cy += 8;

  // Subtitle
  doc.setFont(bodyFont, "normal");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  const subLines = doc.splitTextToSize(state.subtitle, TW - 20);
  for (const ln of subLines) {
    if (cy > H - 55) break;
    doc.text(ln, W / 2, cy, { align: "center" });
    cy += 5.8;
  }

  // Author line
  doc.setFontSize(9);
  doc.text(`por ${state.author}`, W / 2, H - 28, { align: "center" });

  // Pages / chapters
  doc.setFontSize(7.5);
  doc.setTextColor(200, 200, 200);
  doc.text(
    `${template.pages} páginas  ·  ${state.chapters.length} capítulos`,
    W / 2,
    H - 20,
    { align: "center" },
  );

  // ── TOC ───────────────────────────────────────────────────────────────────

  page.num++;
  doc.addPage();
  page.y = 30;
  footerCurrent();

  doc.setFont("times", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...ca);
  doc.text("Índice", ML, page.y);
  page.y += 4;

  doc.setDrawColor(...ca);
  doc.setLineWidth(1);
  doc.line(ML, page.y, ML + 40, page.y);
  doc.setLineWidth(0.2);
  doc.line(ML + 40, page.y, W - MR, page.y);
  page.y += 10;

  state.chapters.forEach((ch, i) => {
    checkSpace(8);
    doc.setFont(bodyFont, "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(40, 40, 40);
    const label = `${i + 1}.  ${ch.title}`;
    const lns = doc.splitTextToSize(label, TW - 15);
    doc.text(lns[0], ML, page.y);
    page.y += 6.5;
  });

  if (state.bonus) {
    page.y += 3;
    checkSpace(8);
    doc.setFont(bodyFont, "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(40, 40, 40);
    doc.text(`Bônus: ${state.bonus.title}`, ML, page.y);
    page.y += 6.5;
  }

  // ── CHAPTERS ─────────────────────────────────────────────────────────────

  for (let i = 0; i < state.chapters.length; i++) {
    const ch = state.chapters[i];
    page.num++;
    doc.addPage();
    page.y = 22;
    footerCurrent();

    // Header rule
    doc.setDrawColor(...ca);
    doc.setLineWidth(0.25);
    doc.line(ML, 18, W - MR, 18);

    // Badge
    if (ch.badge) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...ca);
      doc.text(ch.badge.toUpperCase(), ML, page.y);
      page.y += 5;
    }

    // Chapter number
    doc.setFont("times", "bold");
    doc.setFontSize(40);
    doc.setTextColor(...caLight);
    doc.text(String(i + 1).padStart(2, "0"), ML, page.y + 10);
    page.y += 6;

    // Chapter title
    doc.setFont("times", "bold");
    doc.setFontSize(17);
    doc.setTextColor(20, 20, 20);
    const ctLines = doc.splitTextToSize(ch.title, TW - 18);
    for (const ln of ctLines) {
      doc.text(ln, ML + 18, page.y);
      page.y += 7.5;
    }
    page.y += 2;

    // Decorative rule
    doc.setDrawColor(...ca);
    doc.setLineWidth(1.5);
    doc.line(ML, page.y, ML + 25, page.y);
    doc.setLineWidth(0.2);
    doc.line(ML + 25, page.y, W - MR, page.y);
    page.y += 10;

    // Pull quote
    if (ch.pullQuote) {
      checkSpace(16);
      const pqLines = doc.splitTextToSize(`"${ch.pullQuote}"`, TW - 10);
      const pqH = pqLines.length * lineH(10.5) + 8;
      // Left accent
      doc.setFillColor(...ca);
      doc.rect(ML, page.y - 2, 2.5, pqH, "F");
      doc.setFont(bodyFont, "italic");
      doc.setFontSize(10.5);
      doc.setTextColor(80, 80, 80);
      for (const ln of pqLines) {
        doc.text(ln, ML + 7, page.y);
        page.y += lineH(10.5);
      }
      page.y += 7;
    }

    // Body paragraphs
    const paragraphs = ch.body.split(/\n{2,}/);
    for (const para of paragraphs) {
      const p = para.trim().replace(/\n/g, " ");
      if (!p) continue;

      // Detect heading-like lines (ALL CAPS, short)
      if (p.length < 80 && p === p.toUpperCase() && !p.startsWith("•")) {
        addParagraph(p, {
          font: "helvetica",
          style: "bold",
          size: 9.5,
          color: ca,
          spaceBefore: 7,
          spaceAfter: 4,
        });
      } else {
        addParagraph(p, { spaceBefore: 0, spaceAfter: 3.5 });
      }
    }

    // Checklist
    if (ch.checklist && ch.checklist.length > 0) {
      checkSpace(14);
      page.y += 5;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...ca);
      doc.text("✔  CHECKLIST", ML, page.y);
      page.y += 6;

      for (const item of ch.checklist) {
        checkSpace(8);
        // Small square checkbox
        doc.setDrawColor(...ca);
        doc.setLineWidth(0.35);
        doc.rect(ML, page.y - 3.2, 3.5, 3.5);
        addParagraph(item, { size: 9.5, indent: 6, spaceBefore: 0, spaceAfter: 1.5 });
      }
      page.y += 4;
    }

    // Exercise
    if (ch.exercise) {
      checkSpace(18);
      page.y += 4;
      // Tinted background strip
      const exLines = doc.splitTextToSize(ch.exercise, TW - 8);
      const exH = exLines.length * lineH(9.5) + 16;
      doc.setFillColor(...caLight);
      doc.rect(ML - 2, page.y - 4, TW + 4, exH, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...ca);
      doc.text("EXERCÍCIO PRÁTICO", ML + 2, page.y);
      page.y += 6;

      addParagraph(ch.exercise, { size: 9.5, color: [40, 40, 40], indent: 2, spaceAfter: 4 });
      page.y += 4;
    }

    // Block images
    if (ch.images && ch.images.length > 0) {
      for (const img of ch.images) {
        const imgW = TW;
        const imgH = Math.min(imgW / Math.max(img.aspectRatio, 0.1), 150);
        checkSpace(imgH + 10);
        page.y += 5;
        try {
          const fmt = img.dataUrl.startsWith("data:image/png") ? "PNG"
            : img.dataUrl.startsWith("data:image/gif") ? "GIF"
            : "JPEG";
          doc.addImage(img.dataUrl, fmt, ML, page.y, imgW, imgH);
          page.y += imgH + 7;
        } catch { /* skip broken image */ }
      }
    }
  }

  // ── BONUS ────────────────────────────────────────────────────────────────

  if (state.bonus) {
    page.num++;
    doc.addPage();
    page.y = 28;
    footerCurrent();
    doc.setDrawColor(...ca);
    doc.setLineWidth(0.25);
    doc.line(ML, 18, W - MR, 18);

    addParagraph("BÔNUS EXCLUSIVO", { font: "helvetica", style: "bold", size: 8.5, color: ca, spaceAfter: 3 });
    addParagraph(state.bonus.title, { font: "times", style: "bold", size: 18, color: [20, 20, 20], spaceAfter: 4 });
    addParagraph(state.bonus.description, { size: 11, color: [70, 70, 70], spaceAfter: 10 });

    for (const item of state.bonus.items) {
      checkSpace(8);
      doc.setFillColor(...ca);
      doc.rect(ML, page.y - 3, 1.8, 1.8, "F");
      addParagraph(item, { size: 10.5, indent: 6, spaceAfter: 3 });
    }
  }

  // ── CTA ──────────────────────────────────────────────────────────────────

  page.num++;
  doc.addPage();

  // Full color background
  doc.setFillColor(...ca);
  doc.rect(0, 0, W, H, "F");
  // Bottom dark section
  doc.setFillColor(...cb);
  doc.rect(0, H * 0.65, W, H * 0.35, "F");

  let ctaY = 50;
  doc.setFont("times", "bold");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  const ctaHLines = doc.splitTextToSize(state.cta.headline, TW);
  for (const ln of ctaHLines) {
    doc.text(ln, W / 2, ctaY, { align: "center" });
    ctaY += 9;
  }

  ctaY += 4;
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.4);
  doc.line(W / 2 - 20, ctaY, W / 2 + 20, ctaY);
  ctaY += 10;

  doc.setFont(bodyFont, "normal");
  doc.setFontSize(11);
  const ctaBLines = doc.splitTextToSize(state.cta.body, TW - 20);
  for (const ln of ctaBLines) {
    doc.text(ln, W / 2, ctaY, { align: "center" });
    ctaY += 6;
  }

  ctaY += 10;
  // Button rect
  const btnW = Math.min(Math.max(doc.getTextWidth(state.cta.buttonText) + 28, 80), TW - 20);
  const btnX = (W - btnW) / 2;
  doc.setFillColor(...cb);
  doc.roundedRect(btnX, ctaY - 7, btnW, 14, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(state.cta.buttonText, W / 2, ctaY + 2, { align: "center" });
  ctaY += 20;

  doc.setFont(bodyFont, "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(220, 220, 220);
  doc.text(state.cta.urgency, W / 2, ctaY, { align: "center" });

  // ── FINAL PAGE ────────────────────────────────────────────────────────────

  page.num++;
  doc.addPage();
  page.y = 40;
  footerCurrent();
  doc.setDrawColor(...ca);
  doc.setLineWidth(0.25);
  doc.line(ML, 18, W - MR, 18);

  // Accent block
  doc.setFillColor(...ca);
  doc.rect(ML, page.y - 5, 4, 28, "F");

  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.setTextColor(20, 20, 20);
  doc.text("Mensagem Final", ML + 9, page.y + 2);
  page.y += 14;

  addParagraph(state.finalPage, { size: 10.5, color: [60, 60, 60], indent: 5, spaceAfter: 3 });

  // ── SAVE ─────────────────────────────────────────────────────────────────

  const fname = state.title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase()
    .substring(0, 60);

  doc.save(`${fname || "ebook"}.pdf`);
}
