import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import { LAYOUTS, type EbookLayout } from "./layouts";

export interface EbookPdfInput {
  title: string;
  subtitle?: string | null;
  author?: string;
  layout: EbookLayout;
  coverUrl?: string | null;
  chapters: { title: string; markdown: string; imageUrl?: string | null }[];
  identity?: { author?: string; brand?: string; bio?: string };
  extras?: { introduction?: string; conclusion?: string; aboutAuthor?: string; bonus?: string };
  finalCta?: string;
}

const PAGE = { w: 595.28, h: 841.89 }; // A4 portrait

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const para of text.split("\n")) {
    if (!para.trim()) {
      lines.push("");
      continue;
    }
    const words = para.split(/\s+/);
    let cur = "";
    for (const w of words) {
      const tryLine = cur ? `${cur} ${w}` : w;
      if (font.widthOfTextAtSize(tryLine, size) <= maxWidth) cur = tryLine;
      else {
        if (cur) lines.push(cur);
        cur = w;
      }
    }
    if (cur) lines.push(cur);
  }
  return lines;
}

// Minimal markdown parser: h1/h2/h3, bullets, paragraphs, bold strip
type MdBlock = { type: "h1" | "h2" | "h3" | "p" | "li"; text: string };
function parseMd(md: string): MdBlock[] {
  const blocks: MdBlock[] = [];
  const lines = md.replace(/\r/g, "").split("\n");
  let buf: string[] = [];
  const flushP = () => {
    if (buf.length) {
      blocks.push({ type: "p", text: buf.join(" ").trim() });
      buf = [];
    }
  };
  for (const raw of lines) {
    const l = raw.trimEnd();
    if (!l.trim()) {
      flushP();
      continue;
    }
    if (l.startsWith("### ")) {
      flushP();
      blocks.push({ type: "h3", text: l.slice(4) });
    } else if (l.startsWith("## ")) {
      flushP();
      blocks.push({ type: "h2", text: l.slice(3) });
    } else if (l.startsWith("# ")) {
      flushP();
      blocks.push({ type: "h1", text: l.slice(2) });
    } else if (/^\s*[-*]\s+/.test(l)) {
      flushP();
      blocks.push({ type: "li", text: l.replace(/^\s*[-*]\s+/, "") });
    } else {
      buf.push(l.trim());
    }
  }
  flushP();
  // Strip simple markdown emphasis
  return blocks.map((b) => ({ ...b, text: stripEmphasis(b.text) }));
}
function stripEmphasis(s: string) {
  return s
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[(.+?)\]\((.+?)\)/g, "$1");
}

export async function exportEbookPdf(input: EbookPdfInput): Promise<Blob> {
  const spec = LAYOUTS[input.layout];
  const pdf = await PDFDocument.create();
  const isSerif = spec.fontFamily === "serif";
  const fontBody = await pdf.embedFont(isSerif ? StandardFonts.TimesRoman : StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(isSerif ? StandardFonts.TimesRomanBold : StandardFonts.HelveticaBold);

  const margin = spec.margin;
  const contentW = PAGE.w - margin * 2;

  // ---- COVER ----
  const cover = pdf.addPage([PAGE.w, PAGE.h]);
  cover.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE.w,
    height: PAGE.h,
    color: rgb(...spec.coverBg),
  });
  if (input.coverUrl) {
    try {
      const bytes = await fetchAsBytes(input.coverUrl);
      const img = await embedImage(pdf, bytes, input.coverUrl);
      if (img) {
        const ratio = img.width / img.height;
        const targetW = PAGE.w;
        const targetH = targetW / ratio;
        cover.drawImage(img, {
          x: 0,
          y: PAGE.h - targetH,
          width: targetW,
          height: Math.min(targetH, PAGE.h),
          opacity: 0.55,
        });
      }
    } catch (e) {
      console.warn("[ebook] cover image failed", e);
    }
  }
  const titleSize = spec.titleSize;
  const titleLines = wrap(input.title, fontBold, titleSize, PAGE.w - margin * 2);
  let yT = PAGE.h / 2 + titleLines.length * titleSize * 0.6;
  for (const ln of titleLines) {
    cover.drawText(ln, {
      x: margin,
      y: yT,
      size: titleSize,
      font: fontBold,
      color: rgb(...spec.coverText),
    });
    yT -= titleSize * 1.2;
  }
  if (input.subtitle) {
    const subLines = wrap(input.subtitle, fontBody, 16, PAGE.w - margin * 2);
    yT -= 12;
    for (const ln of subLines) {
      cover.drawText(ln, {
        x: margin,
        y: yT,
        size: 16,
        font: fontBody,
        color: rgb(...spec.coverText),
        opacity: 0.85,
      });
      yT -= 22;
    }
  }
  const authorName = input.identity?.author || input.author;
  if (authorName) {
    yT -= 24;
    cover.drawText(`por ${authorName}`, {
      x: margin,
      y: Math.max(yT, margin + 40),
      size: 13,
      font: fontBold,
      color: rgb(...spec.coverText),
      opacity: 0.9,
    });
  }

  // ---- TOC ----
  let page = pdf.addPage([PAGE.w, PAGE.h]);
  let y = PAGE.h - margin;
  page.drawText("Sumário", {
    x: margin,
    y,
    size: spec.headingSize + 6,
    font: fontBold,
    color: rgb(...spec.accent),
  });
  y -= spec.headingSize + 18;
  input.chapters.forEach((c, i) => {
    if (y < margin + 24) {
      page = pdf.addPage([PAGE.w, PAGE.h]);
      y = PAGE.h - margin;
    }
    page.drawText(`${i + 1}. ${c.title}`, {
      x: margin,
      y,
      size: spec.bodySize + 1,
      font: fontBody,
      color: rgb(0.15, 0.15, 0.15),
    });
    y -= spec.bodySize + 10;
  });

  // ---- INTRODUCTION ----
  const drawBlock = (p: PDFPage, block: MdBlock, yPos: number): { page: PDFPage; y: number } => {
    let cy = yPos;
    let cp = p;
    const next = (need: number) => {
      if (cy - need < margin) {
        cp = pdf.addPage([PAGE.w, PAGE.h]);
        cy = PAGE.h - margin;
      }
    };
    if (block.type === "h1" || block.type === "h2" || block.type === "h3") {
      const size =
        block.type === "h1"
          ? spec.headingSize + 4
          : block.type === "h2"
            ? spec.headingSize
            : spec.headingSize - 4;
      const lines = wrap(block.text, fontBold, size, contentW);
      next(size + 12 + (lines.length - 1) * (size + 4));
      cy -= 6;
      for (const ln of lines) {
        cp.drawText(ln, {
          x: margin,
          y: cy,
          size,
          font: fontBold,
          color: rgb(...spec.accent),
        });
        cy -= size + 4;
      }
      cy -= 4;
    } else if (block.type === "li") {
      const lines = wrap(block.text, fontBody, spec.bodySize, contentW - 16);
      lines.forEach((ln, idx) => {
        next(spec.bodySize + spec.lineGap);
        if (idx === 0) {
          cp.drawText("•", {
            x: margin,
            y: cy,
            size: spec.bodySize,
            font: fontBody,
            color: rgb(...spec.accent),
          });
        }
        cp.drawText(ln, {
          x: margin + 14,
          y: cy,
          size: spec.bodySize,
          font: fontBody,
          color: rgb(0.12, 0.12, 0.12),
        });
        cy -= spec.bodySize + spec.lineGap;
      });
    } else {
      const lines = wrap(block.text, fontBody, spec.bodySize, contentW);
      for (const ln of lines) {
        next(spec.bodySize + spec.lineGap);
        cp.drawText(ln, {
          x: margin,
          y: cy,
          size: spec.bodySize,
          font: fontBody,
          color: rgb(0.12, 0.12, 0.12),
        });
        cy -= spec.bodySize + spec.lineGap;
      }
      cy -= 4;
    }
    return { page: cp, y: cy };
  };

  const drawSection = (heading: string, markdown: string) => {
    page = pdf.addPage([PAGE.w, PAGE.h]);
    y = PAGE.h - margin;
    const titleLs = wrap(heading, fontBold, spec.headingSize + 6, contentW);
    for (const ln of titleLs) {
      page.drawText(ln, {
        x: margin,
        y,
        size: spec.headingSize + 6,
        font: fontBold,
        color: rgb(...spec.accent),
      });
      y -= spec.headingSize + 10;
    }
    y -= 12;
    const blocks = parseMd(markdown);
    for (const b of blocks) {
      const r = drawBlock(page, b, y);
      page = r.page;
      y = r.y;
    }
  };

  if (input.extras?.introduction?.trim()) {
    drawSection("Introdução", input.extras.introduction);
  }

  for (let i = 0; i < input.chapters.length; i++) {
    const ch = input.chapters[i];
    page = pdf.addPage([PAGE.w, PAGE.h]);
    y = PAGE.h - margin;
    page.drawText(`Capítulo ${i + 1}`, {
      x: margin,
      y,
      size: spec.bodySize,
      font: fontBody,
      color: rgb(...spec.accent),
    });
    y -= spec.bodySize + 6;
    const titleLs = wrap(ch.title, fontBold, spec.headingSize + 6, contentW);
    for (const ln of titleLs) {
      page.drawText(ln, {
        x: margin,
        y,
        size: spec.headingSize + 6,
        font: fontBold,
        color: rgb(0.05, 0.05, 0.05),
      });
      y -= spec.headingSize + 10;
    }
    y -= 12;
    if (ch.imageUrl) {
      try {
        const bytes = await fetchAsBytes(ch.imageUrl);
        const img = await embedImage(pdf, bytes, ch.imageUrl);
        if (img) {
          const targetW = contentW;
          const targetH = Math.min(targetW * (img.height / img.width), 240);
          if (y - targetH < margin) {
            page = pdf.addPage([PAGE.w, PAGE.h]);
            y = PAGE.h - margin;
          }
          page.drawImage(img, {
            x: margin,
            y: y - targetH,
            width: targetW,
            height: targetH,
          });
          y -= targetH + 14;
        }
      } catch (e) {
        console.warn("[ebook] chapter image failed", e);
      }
    }
    const blocks = parseMd(ch.markdown);
    for (const b of blocks) {
      const r = drawBlock(page, b, y);
      page = r.page;
      y = r.y;
    }
  }

  // ---- CONCLUSION + CTA ----
  if (input.extras?.conclusion?.trim() || input.finalCta?.trim()) {
    const md = [
      input.extras?.conclusion?.trim() ?? "",
      input.finalCta?.trim() ? `\n\n## Próximo passo\n\n${input.finalCta.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    drawSection("Conclusão", md);
  }

  // ---- ABOUT THE AUTHOR ----
  const aboutMd = [
    input.extras?.aboutAuthor?.trim() ?? "",
    input.identity?.bio?.trim() ?? "",
  ]
    .filter(Boolean)
    .join("\n\n");
  if (aboutMd) {
    drawSection(`Sobre ${input.identity?.author ?? "o autor"}`, aboutMd);
  }

  // ---- BONUS ----
  if (input.extras?.bonus?.trim()) {
    drawSection("Bônus", input.extras.bonus);
  }

  // Page numbers
  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    if (i === 0) return; // skip cover
    p.drawText(String(i), {
      x: PAGE.w - margin,
      y: 24,
      size: 9,
      font: fontBody,
      color: rgb(0.4, 0.4, 0.4),
    });
  });

  const bytes = await pdf.save();
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}

async function fetchAsBytes(url: string): Promise<Uint8Array> {
  if (url.startsWith("data:")) {
    const b64 = url.split(",")[1] ?? "";
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr;
  }
  const res = await fetch(url);
  return new Uint8Array(await res.arrayBuffer());
}

async function embedImage(pdf: PDFDocument, bytes: Uint8Array, hint: string) {
  const isPng =
    hint.toLowerCase().includes("png") ||
    (bytes[0] === 0x89 && bytes[1] === 0x50);
  try {
    return isPng ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
  } catch {
    try {
      return await pdf.embedJpg(bytes);
    } catch {
      return null;
    }
  }
}
