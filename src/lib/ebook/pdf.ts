import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import { LAYOUTS, MODES, type EbookLayout, type RenderMode } from "./layouts";
import {
  layoutParagraph,
  parseInline,
  stripEmojis,
  widowOrphanSplit,
  type FontSet,
  type LaidLine,
  type RunStyle,
} from "./typography";

export interface EbookPdfInput {
  title: string;
  subtitle?: string | null;
  author?: string;
  layout: EbookLayout;
  /** Editorial preset. Defaults to "digital" when omitted. */
  renderMode?: RenderMode;
  coverUrl?: string | null;
  chapters: { title: string; markdown: string; imageUrl?: string | null }[];
  identity?: {
    author?: string;
    brand?: string;
    bio?: string;
    copyright?: string;
    disclaimer?: string;
    dedication?: string;
    subtitleLine?: string;
  };
  extras?: {
    introduction?: string;
    conclusion?: string;
    aboutAuthor?: string;
    bonus?: string;
  };
  finalCta?: string;
}

type Block =
  | { type: "h1" | "h2" | "h3"; text: string }
  | { type: "p"; text: string }
  | { type: "li"; text: string; ordered: boolean; index: number };

function parseMd(md: string): Block[] {
  const blocks: Block[] = [];
  const lines = md.replace(/\r/g, "").split("\n");
  let buf: string[] = [];
  let liCounter = 0;
  let inOrdered = false;
  const flushP = () => {
    if (buf.length) {
      blocks.push({ type: "p", text: buf.join(" ").trim() });
      buf = [];
    }
  };
  const resetList = () => {
    liCounter = 0;
    inOrdered = false;
  };
  for (const raw of lines) {
    const l = raw.trimEnd();
    if (!l.trim()) {
      flushP();
      resetList();
      continue;
    }
    if (l.startsWith("### ")) {
      flushP();
      resetList();
      blocks.push({ type: "h3", text: l.slice(4) });
    } else if (l.startsWith("## ")) {
      flushP();
      resetList();
      blocks.push({ type: "h2", text: l.slice(3) });
    } else if (l.startsWith("# ")) {
      flushP();
      resetList();
      blocks.push({ type: "h1", text: l.slice(2) });
    } else if (/^\s*\d+\.\s+/.test(l)) {
      flushP();
      if (!inOrdered) {
        liCounter = 0;
        inOrdered = true;
      }
      liCounter += 1;
      blocks.push({
        type: "li",
        text: l.replace(/^\s*\d+\.\s+/, ""),
        ordered: true,
        index: liCounter,
      });
    } else if (/^\s*[-*]\s+/.test(l)) {
      flushP();
      if (inOrdered) resetList();
      blocks.push({
        type: "li",
        text: l.replace(/^\s*[-*]\s+/, ""),
        ordered: false,
        index: 0,
      });
    } else {
      buf.push(l.trim());
    }
  }
  flushP();
  return blocks;
}

export async function exportEbookPdf(input: EbookPdfInput): Promise<Blob> {
  const layoutSpec = LAYOUTS[input.layout];
  const mode = MODES[input.renderMode ?? "digital"];
  const pdf = await PDFDocument.create();
  const PW = mode.pageSize.w;
  const PH = mode.pageSize.h;

  const isSerif = mode.family === "serif";
  const fonts: FontSet = {
    body: await pdf.embedFont(isSerif ? StandardFonts.TimesRoman : StandardFonts.Helvetica),
    bold: await pdf.embedFont(isSerif ? StandardFonts.TimesRomanBold : StandardFonts.HelveticaBold),
    italic: await pdf.embedFont(isSerif ? StandardFonts.TimesRomanItalic : StandardFonts.HelveticaOblique),
    boldItalic: await pdf.embedFont(
      isSerif ? StandardFonts.TimesRomanBoldItalic : StandardFonts.HelveticaBoldOblique,
    ),
  };

  const M = mode.margins;
  const contentW = PW - M.left - M.right;
  const lineH = mode.bodySize * mode.lineHeight;

  const accent = layoutSpec.accent;
  const ink: [number, number, number] = [0.12, 0.12, 0.14];

  // Track current chapter for headers.
  type State = {
    page: PDFPage;
    y: number;
    chapterTitle: string;
    pageIndex: number; // 0-based, 0 = cover
  };
  const state: State = {
    page: pdf.addPage([PW, PH]),
    y: PH - M.top,
    chapterTitle: "",
    pageIndex: 0,
  };

  // ---------- helpers ----------
  const fontFor = (s: RunStyle): PDFFont =>
    s === "boldItalic"
      ? fonts.boldItalic
      : s === "bold"
      ? fonts.bold
      : s === "italic"
      ? fonts.italic
      : fonts.body;

  const newPage = (): void => {
    state.page = pdf.addPage([PW, PH]);
    state.pageIndex += 1;
    state.y = PH - M.top;
  };

  const isOdd = (idx: number) => idx % 2 === 1; // page 1 (front) is odd → recto

  const ensureRecto = () => {
    if (mode.chapterOpensRecto) {
      // pageIndex of next page is state.pageIndex + 1 once we addPage.
      // We need NEXT page to be odd (recto). Front-matter cover is page 0.
      if (!isOdd(state.pageIndex + 1)) {
        // current page becomes blank, push another
        newPage();
      }
    }
  };

  const drawHeader = (p: PDFPage, pageIdx: number): void => {
    if (!mode.runningHeader || pageIdx <= 0) return;
    if (!state.chapterTitle) return;
    const odd = isOdd(pageIdx);
    const headerText = odd ? state.chapterTitle : input.title;
    const size = Math.max(8, mode.bodySize - 2);
    const font = fonts.italic;
    const tw = font.widthOfTextAtSize(headerText, size);
    const x = odd ? PW - M.right - tw : M.left;
    p.drawText(headerText, {
      x,
      y: PH - M.top / 2,
      size,
      font,
      color: rgb(0.4, 0.4, 0.45),
    });
  };

  const drawFooter = (p: PDFPage, pageIdx: number): void => {
    if (pageIdx <= 0) return;
    const num = String(pageIdx);
    const size = Math.max(8, mode.bodySize - 2);
    const tw = fonts.body.widthOfTextAtSize(num, size);
    // outer corner (mirror left/right per spread)
    const x = isOdd(pageIdx) ? PW - M.right - tw : M.left;
    p.drawText(num, { x, y: M.bottom / 2, size, font: fonts.body, color: rgb(0.45, 0.45, 0.5) });
  };

  // Draw a single laid-out line with optional justification.
  const drawLine = (
    line: LaidLine,
    x: number,
    y: number,
    size: number,
    justify: boolean,
  ) => {
    const free = contentW - line.naturalWidth;
    const extraPerGap = justify && !line.last && line.gaps > 0 ? free / line.gaps : 0;
    let cx = x;
    for (const seg of line.segments) {
      const f = fontFor(seg.style);
      const w = f.widthOfTextAtSize(seg.text, size);
      // highlight background
      if (seg.highlight && seg.text.trim()) {
        state.page.drawRectangle({
          x: cx - 0.5,
          y: y - 2,
          width: w + 1,
          height: size + 2,
          color: rgb(1, 0.93, 0.4),
          opacity: 0.55,
        });
      }
      state.page.drawText(seg.text, { x: cx, y, size, font: f, color: rgb(...ink) });
      // underline
      if (seg.underline && seg.text.trim()) {
        state.page.drawLine({
          start: { x: cx, y: y - 1.5 },
          end: { x: cx + w, y: y - 1.5 },
          thickness: 0.6,
          color: rgb(...ink),
        });
      }
      cx += w;
      if (seg.text.endsWith(" ") || /\s$/.test(seg.text)) {
        // already counted in width
      } else {
        // add inter-word stretch when the next segment is preceded by a space token
      }
      // gap after this segment if it's a "space" token (single space only)
      if (seg.text === " ") {
        cx += extraPerGap;
      }
    }
  };

  /** Page-aware paragraph render with widow/orphan. */
  const drawLines = (lines: LaidLine[], size: number, indentFirst: number, justify: boolean) => {
    let i = 0;
    while (i < lines.length) {
      const remaining = lines.length - i;
      const room = Math.floor((state.y - M.bottom) / lineH);
      const cut = Math.min(remaining, Math.max(0, room));
      const safeCut = i === 0 ? cut : widowOrphanSplit(remaining, cut);
      const take = Math.max(0, safeCut);
      if (take === 0) {
        newPage();
        continue;
      }
      for (let k = 0; k < take; k++) {
        const line = lines[i + k];
        const indent = i === 0 && k === 0 ? indentFirst : 0;
        drawLine(line, M.left + indent, state.y - size, size, justify);
        state.y -= lineH;
      }
      i += take;
      if (i < lines.length) newPage();
    }
  };

  const drawHeading = (text: string, level: 1 | 2 | 3) => {
    const size =
      level === 1 ? layoutSpec.headingSize + 6 : level === 2 ? layoutSpec.headingSize : layoutSpec.headingSize - 4;
    const lines = layoutParagraph(parseInline(text), contentW, size, fonts, 0);
    if (state.y - lines.length * (size + 4) < M.bottom) newPage();
    state.y -= 6;
    for (const l of lines) {
      let cx = M.left;
      for (const seg of l.segments) {
        const f = seg.style === "bold" || seg.style === "boldItalic" ? fonts.bold : fonts.bold;
        state.page.drawText(seg.text, {
          x: cx,
          y: state.y - size,
          size,
          font: f,
          color: rgb(...accent),
        });
        cx += f.widthOfTextAtSize(seg.text, size);
      }
      state.y -= size + 4;
    }
    state.y -= 4;
  };

  const drawListItem = (text: string, ordered: boolean, index: number) => {
    const marker = ordered ? `${index}.` : "•";
    const markerW = fonts.body.widthOfTextAtSize(marker, mode.bodySize);
    const indent = Math.max(14, markerW + 6);
    const runs = parseInline(text);
    const lines = layoutParagraph(runs, contentW - indent, mode.bodySize, fonts, 0);
    if (state.y - lineH < M.bottom) newPage();
    state.page.drawText(marker, {
      x: M.left,
      y: state.y - mode.bodySize,
      size: mode.bodySize,
      font: fonts.body,
      color: rgb(...accent),
    });
    let i = 0;
    while (i < lines.length) {
      const remaining = lines.length - i;
      const room = Math.floor((state.y - M.bottom) / lineH);
      const take = Math.min(remaining, Math.max(0, room));
      if (take === 0) {
        newPage();
        continue;
      }
      for (let k = 0; k < take; k++) {
        const line = lines[i + k];
        drawLine(line, M.left + indent, state.y - mode.bodySize, mode.bodySize, false);
        state.y -= lineH;
      }
      i += take;
      if (i < lines.length) newPage();
    }
  };

  /** Draw paragraph with optional drop cap on first paragraph of chapter. */
  const drawParagraph = (text: string, opts: { dropCap?: boolean; firstLineIndent: number }) => {
    if (!text.trim()) return;
    const runs = parseInline(text);
    if (opts.dropCap && mode.dropCap && runs[0]?.text) {
      const firstChar = runs[0].text.trimStart().charAt(0);
      if (firstChar) {
        // Drop cap = ~3 lines tall
        const dcSize = mode.bodySize * 3.2;
        const dcFont = fonts.bold;
        const dcW = dcFont.widthOfTextAtSize(firstChar, dcSize);
        const dcGutter = 4;
        // remove the first char from runs
        const stripped: typeof runs = [...runs];
        const head = stripped[0];
        head.text = head.text.replace(/^\s*./, "");
        // ensure a space follows
        if (head.text && !/^\s/.test(head.text)) head.text = " " + head.text;
        const wrapW = contentW - dcW - dcGutter;
        const lines = layoutParagraph(stripped, wrapW, mode.bodySize, fonts, 0);
        if (state.y - lineH * 3 < M.bottom) newPage();
        // Draw the drop cap glyph
        const dcY = state.y - dcSize * 0.85;
        state.page.drawText(firstChar, {
          x: M.left,
          y: dcY,
          size: dcSize,
          font: dcFont,
          color: rgb(...accent),
        });
        // First 3 lines wrap to the right of the cap
        const wrapLines = Math.min(3, lines.length);
        for (let k = 0; k < wrapLines; k++) {
          drawLine(
            lines[k],
            M.left + dcW + dcGutter,
            state.y - mode.bodySize,
            mode.bodySize,
            mode.justify,
          );
          state.y -= lineH;
        }
        if (lines.length > wrapLines) {
          drawLines(lines.slice(wrapLines), mode.bodySize, 0, mode.justify);
        }
        if (mode.paragraphGap) state.y -= mode.paragraphGap;
        return;
      }
    }
    const lines = layoutParagraph(runs, contentW, mode.bodySize, fonts, opts.firstLineIndent);
    drawLines(lines, mode.bodySize, opts.firstLineIndent, mode.justify);
    if (mode.paragraphGap) state.y -= mode.paragraphGap;
  };

  const drawBlocks = (blocks: Block[], chapterStart = false) => {
    let firstPara = chapterStart;
    for (const b of blocks) {
      if (b.type === "h1" || b.type === "h2" || b.type === "h3") {
        drawHeading(b.text, b.type === "h1" ? 1 : b.type === "h2" ? 2 : 3);
        firstPara = false;
      } else if (b.type === "li") {
        drawListItem(b.text, b.ordered, b.index);
        firstPara = false;
      } else {
        drawParagraph(b.text, {
          dropCap: firstPara,
          firstLineIndent: firstPara ? 0 : mode.firstLineIndent,
        });
        firstPara = false;
      }
    }
  };

  // ============ COVER (page 0) ============
  state.page.drawRectangle({
    x: 0,
    y: 0,
    width: PW,
    height: PH,
    color: rgb(...layoutSpec.coverBg),
  });
  if (input.coverUrl) {
    try {
      const bytes = await fetchAsBytes(input.coverUrl);
      const img = await embedImage(pdf, bytes, input.coverUrl);
      if (img) {
        const ratio = img.width / img.height;
        const tw = PW;
        const th = tw / ratio;
        state.page.drawImage(img, {
          x: 0,
          y: PH - th,
          width: tw,
          height: Math.min(th, PH),
          opacity: 0.55,
        });
      }
    } catch (e) {
      console.warn("[ebook] cover image failed", e);
    }
  }
  {
    const tSize = layoutSpec.titleSize;
    const tLines = layoutParagraph(
      [{ text: stripEmojis(input.title), style: "bold" }],
      PW - M.left - M.right,
      tSize,
      fonts,
      0,
    );
    let yT = PH / 2 + tLines.length * tSize * 0.6;
    for (const l of tLines) {
      let cx = M.left;
      for (const seg of l.segments) {
        state.page.drawText(seg.text, {
          x: cx,
          y: yT,
          size: tSize,
          font: fonts.bold,
          color: rgb(...layoutSpec.coverText),
        });
        cx += fonts.bold.widthOfTextAtSize(seg.text, tSize);
      }
      yT -= tSize * 1.2;
    }
    if (input.subtitle) {
      yT -= 12;
      state.page.drawText(stripEmojis(input.subtitle), {
        x: M.left,
        y: yT,
        size: 16,
        font: fonts.italic,
        color: rgb(...layoutSpec.coverText),
        opacity: 0.85,
      });
      yT -= 22;
    }
    const author = input.identity?.author || input.author;
    if (author) {
      state.page.drawText(`por ${author}`, {
        x: M.left,
        y: Math.max(yT - 24, M.bottom + 40),
        size: 13,
        font: fonts.bold,
        color: rgb(...layoutSpec.coverText),
        opacity: 0.9,
      });
    }
  }

  // ============ FRONTMATTER (KDP / print) ============
  if (mode.fullFrontmatter) {
    // blank page after cover
    newPage();

    // Title page (recto)
    if (!isOdd(state.pageIndex + 1)) newPage();
    newPage();
    {
      const tSize = layoutSpec.titleSize - 2;
      state.y = PH * 0.62;
      const lines = layoutParagraph(
        [{ text: stripEmojis(input.title), style: "bold" }],
        contentW,
        tSize,
        fonts,
        0,
      );
      for (const l of lines) {
        const w = l.segments.reduce(
          (a, s) => a + fonts.bold.widthOfTextAtSize(s.text, tSize),
          0,
        );
        state.page.drawText(
          l.segments.map((s) => s.text).join(""),
          {
            x: (PW - w) / 2,
            y: state.y,
            size: tSize,
            font: fonts.bold,
            color: rgb(...ink),
          },
        );
        state.y -= tSize * 1.2;
      }
      const sub = input.identity?.subtitleLine || input.subtitle;
      if (sub) {
        const s = stripEmojis(sub);
        const w = fonts.italic.widthOfTextAtSize(s, 14);
        state.y -= 8;
        state.page.drawText(s, {
          x: (PW - w) / 2,
          y: state.y,
          size: 14,
          font: fonts.italic,
          color: rgb(0.35, 0.35, 0.4),
        });
      }
      const author = input.identity?.author || input.author;
      if (author) {
        const w = fonts.body.widthOfTextAtSize(author, 13);
        state.page.drawText(author, {
          x: (PW - w) / 2,
          y: M.bottom + 60,
          size: 13,
          font: fonts.body,
          color: rgb(...ink),
        });
      }
    }

    // Copyright (verso)
    newPage();
    {
      state.y = M.top + 80;
      const year = new Date().getFullYear();
      const author = input.identity?.author || input.author || "Autor";
      const lines = [
        input.identity?.copyright?.trim() || `Copyright © ${year} ${author}`,
        "Todos os direitos reservados.",
        "",
        ...(input.identity?.brand?.trim() ? [`Publicado por ${input.identity.brand}.`] : []),
        "",
        ...(input.identity?.disclaimer?.trim()
          ? [input.identity.disclaimer.trim()]
          : [
              "Nenhuma parte deste livro pode ser reproduzida ou transmitida sem a autorização prévia e por escrito do autor.",
            ]),
      ];
      for (const ln of lines) {
        const wrapped = layoutParagraph(parseInline(ln), contentW, 10, fonts, 0);
        for (const wl of wrapped) {
          drawLine(wl, M.left, state.y, 10, false);
          state.y -= 14;
        }
        state.y -= 4;
      }
    }

    // Dedication (recto)
    if (input.identity?.dedication?.trim()) {
      newPage();
      if (!isOdd(state.pageIndex)) newPage();
      const text = input.identity.dedication.trim();
      state.y = PH * 0.58;
      const lines = layoutParagraph(parseInline(text), contentW * 0.7, 13, fonts, 0);
      for (const l of lines) {
        const w = l.naturalWidth;
        state.page.drawText(l.segments.map((s) => s.text).join(""), {
          x: (PW - w) / 2,
          y: state.y,
          size: 13,
          font: fonts.italic,
          color: rgb(0.3, 0.3, 0.35),
        });
        state.y -= 18;
      }
    }
  }

  // ============ TOC ============
  newPage();
  if (mode.fullFrontmatter && !isOdd(state.pageIndex)) newPage();
  state.page.drawText("Sumário", {
    x: M.left,
    y: state.y - layoutSpec.headingSize,
    size: layoutSpec.headingSize + 6,
    font: fonts.bold,
    color: rgb(...accent),
  });
  state.y -= layoutSpec.headingSize + 24;
  input.chapters.forEach((c, i) => {
    if (state.y < M.bottom + lineH) newPage();
    const label = `${i + 1}. ${stripEmojis(c.title)}`;
    state.page.drawText(label, {
      x: M.left,
      y: state.y - mode.bodySize,
      size: mode.bodySize + 1,
      font: fonts.body,
      color: rgb(...ink),
    });
    state.y -= mode.bodySize + 10;
  });

  // ============ INTRODUCTION ============
  if (input.extras?.introduction?.trim()) {
    newPage();
    if (mode.chapterOpensRecto && !isOdd(state.pageIndex)) newPage();
    state.chapterTitle = "Introdução";
    state.y = PH - mode.chapterTopMargin;
    state.page.drawText("Introdução", {
      x: M.left,
      y: state.y,
      size: layoutSpec.headingSize + 6,
      font: fonts.bold,
      color: rgb(...accent),
    });
    state.y -= layoutSpec.headingSize + 24;
    drawBlocks(parseMd(input.extras.introduction), true);
  }

  // ============ CHAPTERS ============
  for (let i = 0; i < input.chapters.length; i++) {
    const ch = input.chapters[i];
    if (mode.blankBetweenChapters || mode.chapterOpensRecto) {
      newPage();
      if (mode.chapterOpensRecto && !isOdd(state.pageIndex)) newPage();
    } else {
      newPage();
    }
    state.chapterTitle = stripEmojis(ch.title);
    state.y = PH - mode.chapterTopMargin;
    state.page.drawText(`Capítulo ${i + 1}`, {
      x: M.left,
      y: state.y,
      size: mode.bodySize,
      font: fonts.italic,
      color: rgb(...accent),
    });
    state.y -= mode.bodySize + 10;
    const titleSize = layoutSpec.headingSize + 8;
    const tLines = layoutParagraph(
      [{ text: state.chapterTitle, style: "bold" }],
      contentW,
      titleSize,
      fonts,
      0,
    );
    for (const tl of tLines) {
      state.page.drawText(tl.segments.map((s) => s.text).join(""), {
        x: M.left,
        y: state.y - titleSize,
        size: titleSize,
        font: fonts.bold,
        color: rgb(...ink),
      });
      state.y -= titleSize + 4;
    }
    state.y -= 18;

    if (ch.imageUrl) {
      try {
        const bytes = await fetchAsBytes(ch.imageUrl);
        const img = await embedImage(pdf, bytes, ch.imageUrl);
        if (img) {
          const tw = contentW;
          const th = Math.min(tw * (img.height / img.width), 240);
          if (state.y - th < M.bottom) newPage();
          state.page.drawImage(img, { x: M.left, y: state.y - th, width: tw, height: th });
          state.y -= th + 14;
        }
      } catch (e) {
        console.warn("[ebook] chapter image failed", e);
      }
    }

    drawBlocks(parseMd(ch.markdown), true);
  }

  // ============ CONCLUSION + CTA ============
  if (input.extras?.conclusion?.trim() || input.finalCta?.trim()) {
    newPage();
    if (mode.chapterOpensRecto && !isOdd(state.pageIndex)) newPage();
    state.chapterTitle = "Conclusão";
    state.y = PH - mode.chapterTopMargin;
    state.page.drawText("Conclusão", {
      x: M.left,
      y: state.y,
      size: layoutSpec.headingSize + 6,
      font: fonts.bold,
      color: rgb(...accent),
    });
    state.y -= layoutSpec.headingSize + 24;
    const md =
      (input.extras?.conclusion?.trim() ?? "") +
      (input.finalCta?.trim() ? `\n\n## Próximo passo\n\n${input.finalCta.trim()}` : "");
    drawBlocks(parseMd(md), true);
  }

  // ============ ABOUT THE AUTHOR ============
  const aboutMd = [input.extras?.aboutAuthor?.trim() ?? "", input.identity?.bio?.trim() ?? ""]
    .filter(Boolean)
    .join("\n\n");
  if (aboutMd) {
    newPage();
    if (mode.chapterOpensRecto && !isOdd(state.pageIndex)) newPage();
    state.chapterTitle = `Sobre ${input.identity?.author ?? "o autor"}`;
    state.y = PH - mode.chapterTopMargin;
    state.page.drawText(state.chapterTitle, {
      x: M.left,
      y: state.y,
      size: layoutSpec.headingSize + 6,
      font: fonts.bold,
      color: rgb(...accent),
    });
    state.y -= layoutSpec.headingSize + 24;
    drawBlocks(parseMd(aboutMd), true);
  }

  // ============ BONUS ============
  if (input.extras?.bonus?.trim()) {
    newPage();
    if (mode.chapterOpensRecto && !isOdd(state.pageIndex)) newPage();
    state.chapterTitle = "Bônus";
    state.y = PH - mode.chapterTopMargin;
    state.page.drawText("Bônus", {
      x: M.left,
      y: state.y,
      size: layoutSpec.headingSize + 6,
      font: fonts.bold,
      color: rgb(...accent),
    });
    state.y -= layoutSpec.headingSize + 24;
    drawBlocks(parseMd(input.extras.bonus), true);
  }

  // ============ Headers + page numbers (post-pass) ============
  const pages = pdf.getPages();
  pages.forEach((p, idx) => {
    if (idx === 0) return;
    drawHeader(p, idx);
    drawFooter(p, idx);
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
    hint.toLowerCase().includes("png") || (bytes[0] === 0x89 && bytes[1] === 0x50);
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
