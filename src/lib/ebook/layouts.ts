export type EbookLayout = "classico" | "moderno" | "minimalista";

export interface LayoutSpec {
  id: EbookLayout;
  label: string;
  description: string;
  // PDF rendering
  fontFamily: "serif" | "sans";
  margin: number; // points
  titleSize: number;
  headingSize: number;
  bodySize: number;
  lineGap: number;
  accent: [number, number, number]; // 0..1 RGB
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