import type { EbookLayout } from "./layouts";

export type EbookStyle =
  | "clean"
  | "premium"
  | "canva"
  | "gamma"
  | "amazon-kdp"
  | "dark"
  | "luxo"
  | "feminino"
  | "infantil"
  | "playbook";

export type EbookPalette =
  | "rosa"
  | "azul"
  | "preto"
  | "dourado"
  | "lilas"
  | "minimalista"
  | "neon";

export type EbookMode = "kdp" | "premium" | "playbook";

export interface StyleSpec {
  id: EbookStyle;
  label: string;
  description: string;
  mode: EbookMode;
  layout: EbookLayout;
  promptHint: string;
}

export const STYLES: StyleSpec[] = [
  { id: "clean", label: "Clean", description: "Tipografia limpa, foco no texto.", mode: "kdp", layout: "minimalista", promptHint: "design clean, tipografia limpa, muito espaço em branco" },
  { id: "premium", label: "Premium", description: "Visual sofisticado e refinado.", mode: "premium", layout: "moderno", promptHint: "design premium, sofisticado, detalhes refinados" },
  { id: "canva", label: "Canva Style", description: "Cores vibrantes e blocos modernos.", mode: "premium", layout: "moderno", promptHint: "estilo Canva moderno, blocos coloridos, ilustrações vetoriais" },
  { id: "gamma", label: "Gamma Style", description: "Layout editorial dinâmico.", mode: "premium", layout: "moderno", promptHint: "estilo Gamma editorial, gradientes suaves, tipografia bold" },
  { id: "amazon-kdp", label: "Amazon KDP", description: "Padrão pronto para publicação.", mode: "kdp", layout: "classico", promptHint: "capa estilo Amazon KDP, profissional, vendável" },
  { id: "dark", label: "Dark", description: "Fundo escuro com contraste alto.", mode: "premium", layout: "moderno", promptHint: "fundo escuro, contraste alto, atmosfera dramática" },
  { id: "luxo", label: "Luxo", description: "Dourado, serifa, alto padrão.", mode: "premium", layout: "classico", promptHint: "estilo luxo, dourado, serifa elegante, alto padrão" },
  { id: "feminino", label: "Feminino", description: "Tons suaves, elegante.", mode: "premium", layout: "moderno", promptHint: "estilo feminino delicado, tons suaves, elegante" },
  { id: "infantil", label: "Infantil", description: "Cores alegres, ilustrado.", mode: "premium", layout: "moderno", promptHint: "estilo infantil, ilustrações alegres, cores primárias" },
  { id: "playbook", label: "Playbook", description: "Cenas e narrativa visual.", mode: "playbook", layout: "moderno", promptHint: "narrativa visual, cenas sequenciais" },
];

export interface PaletteSpec {
  id: EbookPalette;
  label: string;
  swatch: string; // tailwind class for chip preview
  promptHint: string;
}

export const PALETTES: PaletteSpec[] = [
  { id: "rosa", label: "Rosa", swatch: "bg-pink-400", promptHint: "paleta rosa pastel e magenta" },
  { id: "azul", label: "Azul", swatch: "bg-blue-500", promptHint: "paleta azul royal e ciano" },
  { id: "preto", label: "Preto", swatch: "bg-neutral-900", promptHint: "paleta preto e branco com acento neutro" },
  { id: "dourado", label: "Dourado", swatch: "bg-amber-400", promptHint: "paleta dourado e champagne sobre fundo escuro" },
  { id: "lilas", label: "Lilás", swatch: "bg-violet-400", promptHint: "paleta lilás, lavanda e violeta" },
  { id: "minimalista", label: "Minimalista", swatch: "bg-zinc-200", promptHint: "paleta minimalista off-white com um único acento" },
  { id: "neon", label: "Neon", swatch: "bg-fuchsia-500", promptHint: "paleta neon, fúcsia e ciano vibrantes sobre preto" },
];

export function styleToMode(style: EbookStyle): EbookMode {
  return STYLES.find((s) => s.id === style)?.mode ?? "kdp";
}

export function styleToLayout(style: EbookStyle): EbookLayout {
  return STYLES.find((s) => s.id === style)?.layout ?? "classico";
}

export const EBOOK_CATEGORIES = [
  "Amazon/KDP",
  "Low Ticket",
  "Emagrecimento",
  "Receita",
  "Romance",
  "Infantil",
  "Negócios",
  "Desenvolvimento Pessoal",
  "PLR",
  "Apostila",
  "Playbook",
] as const;
export type EbookCategory = (typeof EBOOK_CATEGORIES)[number];