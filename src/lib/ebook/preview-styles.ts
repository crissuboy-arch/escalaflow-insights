import type { EbookLayout } from "./layouts";

export interface PreviewStyle {
  fontFamily: string;
  bodySize: string;
  headingSize: string;
  titleSize: string;
  lineHeight: number;
  margin: string;
  accent: string;
  coverBg: string;
  coverText: string;
  textAlign: "left" | "justify";
}

export const PREVIEW_STYLES: Record<EbookLayout, PreviewStyle> = {
  classico: {
    fontFamily: '"Georgia", "Times New Roman", serif',
    bodySize: "12pt",
    headingSize: "20pt",
    titleSize: "36pt",
    lineHeight: 1.55,
    margin: "48px 56px",
    accent: "#9e7327",
    coverBg: "#16161c",
    coverText: "#f7eecf",
    textAlign: "justify",
  },
  moderno: {
    fontFamily: '"Inter", "Helvetica Neue", system-ui, sans-serif',
    bodySize: "12pt",
    headingSize: "22pt",
    titleSize: "38pt",
    lineHeight: 1.6,
    margin: "44px 52px",
    accent: "#2972f3",
    coverBg: "#0f1933",
    coverText: "#ffffff",
    textAlign: "left",
  },
  minimalista: {
    fontFamily: '"Helvetica Neue", "Inter", system-ui, sans-serif',
    bodySize: "11pt",
    headingSize: "18pt",
    titleSize: "32pt",
    lineHeight: 1.7,
    margin: "72px 80px",
    accent: "#000000",
    coverBg: "#ffffff",
    coverText: "#000000",
    textAlign: "left",
  },
};