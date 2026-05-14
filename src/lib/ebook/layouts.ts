export type EbookLayout = "classico" | "moderno" | "minimalista";
export type RenderMode = "digital" | "print" | "kdp";

export interface LayoutSpec {
  id: EbookLayout;
  label: string;
  description: string;
  fontFamily: "serif" | "sans";
  margin: number;
  titleSize: number;
  headingSize: number;
  bodySize: number;
  lineGap: number;
  accent: [number, number, number];
  coverBg: [number, number, number];
  coverText: [number, number, number];
}

export const LAYOUTS: Record<EbookLayout, LayoutSpec> = {
  classico: {
    id: "classico",
    label: "Editorial Clássico",
    description: "Serifa elegante, texto justificado, paleta sóbria com dourado.",
    fontFamily: "serif",
    margin: 64,
    titleSize: 36,
    headingSize: 20,
    bodySize: 12,
    lineGap: 6,
    accent: [0.62, 0.45, 0.16],
    coverBg: [0.09, 0.09, 0.12],
    coverText: [0.97, 0.93, 0.81],
  },
  moderno: {
    id: "moderno",
    label: "Moderno Funcional",
    description: "Sans-serif geométrica, blocos vibrantes, ritmo dinâmico.",
    fontFamily: "sans",
    margin: 56,
    titleSize: 38,
    headingSize: 22,
    bodySize: 12,
    lineGap: 7,
    accent: [0.16, 0.45, 0.95],
    coverBg: [0.06, 0.1, 0.2],
    coverText: [1, 1, 1],
  },
  minimalista: {
    id: "minimalista",
    label: "Minimalista Suíço",
    description: "Helvetica, grid rígido, muito espaço em branco.",
    fontFamily: "sans",
    margin: 80,
    titleSize: 32,
    headingSize: 18,
    bodySize: 11,
    lineGap: 6,
    accent: [0, 0, 0],
    coverBg: [1, 1, 1],
    coverText: [0, 0, 0],
  },
};

/** Editorial preset: physical / digital production rules. */
export interface ModeSpec {
  id: RenderMode;
  label: string;
  pageSize: { w: number; h: number }; // points
  family: "serif" | "sans";
  bodySize: number;
  lineHeight: number; // multiplier on bodySize
  margins: { top: number; right: number; bottom: number; left: number };
  justify: boolean;
  firstLineIndent: number; // points
  dropCap: boolean;
  runningHeader: boolean;
  blankBetweenChapters: boolean;
  chapterOpensRecto: boolean; // open on odd page
  chapterTopMargin: number; // extra top whitespace at chapter open
  fullFrontmatter: boolean; // KDP-grade
  paragraphGap: number; // extra space between paragraphs
}

const A4 = { w: 595.28, h: 841.89 };
const KDP_6x9 = { w: 432, h: 648 };

export const MODES: Record<RenderMode, ModeSpec> = {
  digital: {
    id: "digital",
    label: "Ebook Digital",
    pageSize: A4,
    family: "sans",
    bodySize: 12,
    lineHeight: 1.6,
    margins: { top: 64, right: 56, bottom: 64, left: 56 },
    justify: false,
    firstLineIndent: 0,
    dropCap: false,
    runningHeader: false,
    blankBetweenChapters: false,
    chapterOpensRecto: false,
    chapterTopMargin: 100,
    fullFrontmatter: false,
    paragraphGap: 6,
  },
  print: {
    id: "print",
    label: "Livro Impresso",
    pageSize: A4,
    family: "serif",
    bodySize: 11,
    lineHeight: 1.45,
    margins: { top: 72, right: 64, bottom: 72, left: 64 },
    justify: true,
    firstLineIndent: 18,
    dropCap: true,
    runningHeader: true,
    blankBetweenChapters: true,
    chapterOpensRecto: true,
    chapterTopMargin: 200,
    fullFrontmatter: true,
    paragraphGap: 0,
  },
  kdp: {
    id: "kdp",
    label: "Amazon KDP",
    pageSize: KDP_6x9,
    family: "serif",
    bodySize: 10.5,
    lineHeight: 1.4,
    margins: { top: 72, right: 54, bottom: 72, left: 72 }, // gutter on left
    justify: true,
    firstLineIndent: 16,
    dropCap: true,
    runningHeader: true,
    blankBetweenChapters: true,
    chapterOpensRecto: true,
    chapterTopMargin: 180,
    fullFrontmatter: true,
    paragraphGap: 0,
  },
};
