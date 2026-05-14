/**
 * Editorial typography helpers for the PDF engine:
 * - inline markdown parser (bold, italic, underline, ==highlight==)
 * - real per-line justification with word-spacing
 * - widow/orphan control
 * - drop-cap measurement
 * - emoji-only stripping (does not eat dashes, arrows, %, °…)
 */
import type { PDFFont } from "pdf-lib";

export type RunStyle = "body" | "bold" | "italic" | "boldItalic";

export interface InlineRun {
  text: string;
  style: RunStyle;
  underline?: boolean;
  highlight?: boolean;
}

export interface FontSet {
  body: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
  boldItalic: PDFFont;
}

/** Strip ONLY real emoji glyphs. Keep typographic punctuation. */
export function stripEmojis(s: string): string {
  // \p{Extended_Pictographic} requires the /u flag.
  return s.replace(/\p{Extended_Pictographic}/gu, "").replace(/\uFE0F/g, "");
}

/** Parse inline markdown into typed runs. Greedy left-to-right. */
export function parseInline(input: string): InlineRun[] {
  const text = stripEmojis(input);
  const runs: InlineRun[] = [];
  let i = 0;
  let buf = "";
  let bold = false;
  let italic = false;
  let underline = false;
  let highlight = false;

  const flush = () => {
    if (!buf) return;
    const style: RunStyle =
      bold && italic ? "boldItalic" : bold ? "bold" : italic ? "italic" : "body";
    runs.push({ text: buf, style, underline, highlight });
    buf = "";
  };

  while (i < text.length) {
    const c = text[i];
    const c2 = text[i + 1];
    if (c === "*" && c2 === "*") {
      flush();
      bold = !bold;
      i += 2;
      continue;
    }
    if (c === "_" && c2 === "_") {
      flush();
      underline = !underline;
      i += 2;
      continue;
    }
    if (c === "=" && c2 === "=") {
      flush();
      highlight = !highlight;
      i += 2;
      continue;
    }
    if (c === "*" || c === "_") {
      flush();
      italic = !italic;
      i += 1;
      continue;
    }
    if (c === "`") {
      // strip code ticks, keep content
      i += 1;
      continue;
    }
    // markdown links [text](url) -> text
    if (c === "[") {
      const close = text.indexOf("](", i);
      const end = close > 0 ? text.indexOf(")", close) : -1;
      if (close > 0 && end > 0) {
        buf += text.slice(i + 1, close);
        i = end + 1;
        continue;
      }
    }
    buf += c;
    i += 1;
  }
  flush();
  return runs.length ? runs : [{ text: "", style: "body" }];
}

function fontFor(style: RunStyle, fonts: FontSet): PDFFont {
  return style === "boldItalic"
    ? fonts.boldItalic
    : style === "bold"
    ? fonts.bold
    : style === "italic"
    ? fonts.italic
    : fonts.body;
}

/** A single laid-out line: list of runs already broken to fit. */
export interface LaidLine {
  segments: { text: string; style: RunStyle; underline: boolean; highlight: boolean }[];
  /** width consumed (no extra spacing) */
  naturalWidth: number;
  /** number of inter-word gaps in this line (used for justify) */
  gaps: number;
  /** is this the final line of the paragraph (never justify) */
  last: boolean;
}

/** Measure run width at a given size. */
function measure(run: { text: string; style: RunStyle }, size: number, fonts: FontSet): number {
  return fontFor(run.style, fonts).widthOfTextAtSize(run.text, size);
}

const SPACE_RUN = (style: RunStyle): InlineRun => ({ text: " ", style, underline: false, highlight: false });

/**
 * Lay out runs into lines that fit `maxWidth`. Word-aware. Preserves run styles.
 * `firstLineIndent` reserves space at the start of the first line only.
 */
export function layoutParagraph(
  runs: InlineRun[],
  maxWidth: number,
  size: number,
  fonts: FontSet,
  firstLineIndent = 0,
): LaidLine[] {
  type Tok = { text: string; style: RunStyle; underline: boolean; highlight: boolean; w: number; isSpace: boolean };
  const tokens: Tok[] = [];
  for (const r of runs) {
    if (!r.text) continue;
    const parts = r.text.split(/(\s+)/);
    for (const p of parts) {
      if (!p) continue;
      const isSpace = /^\s+$/.test(p);
      tokens.push({
        text: isSpace ? " " : p,
        style: r.style,
        underline: !!r.underline,
        highlight: !!r.highlight,
        w: measure({ text: isSpace ? " " : p, style: r.style }, size, fonts),
        isSpace,
      });
    }
  }

  const lines: LaidLine[] = [];
  let cur: Tok[] = [];
  let curW = 0;
  let limit = maxWidth - firstLineIndent;

  const pushLine = (last: boolean) => {
    // strip leading/trailing spaces
    while (cur.length && cur[0].isSpace) {
      curW -= cur[0].w;
      cur.shift();
    }
    while (cur.length && cur[cur.length - 1].isSpace) {
      curW -= cur[cur.length - 1].w;
      cur.pop();
    }
    if (!cur.length) return;
    const gaps = cur.filter((t) => t.isSpace).length;
    lines.push({
      segments: cur.map((t) => ({ text: t.text, style: t.style, underline: t.underline, highlight: t.highlight })),
      naturalWidth: curW,
      gaps,
      last,
    });
    cur = [];
    curW = 0;
    limit = maxWidth;
  };

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (curW + t.w > limit && cur.length) {
      pushLine(false);
    }
    // skip leading space on a fresh line
    if (!cur.length && t.isSpace) continue;
    cur.push(t);
    curW += t.w;
  }
  pushLine(true);
  return lines;
}

/** Apply widow/orphan control: if only 1 line orphaned at top of next page,
 *  pull the previous line down too. Returns split index for current page. */
export function widowOrphanSplit(totalLines: number, fitOnPage: number): number {
  if (fitOnPage >= totalLines) return totalLines;
  if (fitOnPage <= 0) return 0;
  // would leave 1 line on next page → pull one back
  if (totalLines - fitOnPage === 1 && fitOnPage >= 2) return fitOnPage - 1;
  // would leave 1 line as first on next page (orphan): keep ≥2 on current
  if (fitOnPage === 1 && totalLines >= 2) return 0;
  return fitOnPage;
}
