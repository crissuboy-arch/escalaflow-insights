import type { PageSkillConfig } from "./types";

export const ebookPageSkill: PageSkillConfig = {
  id: "ebook-page",
  name: "Página de Ebook",
  description: "Página de venda para ebooks e guias digitais",
  systemPrompt: `You are an expert at selling digital books and guides online.
Generate a COMPLETE HTML sales page for an ebook or digital guide.

REQUIRED STRUCTURE:
1. HERO: Headline stating the specific transformation/result + mockup image placeholder of the ebook cover
2. WHO IS THIS FOR: 4-5 bullet points "Este guia é para você se..."
3. WHAT YOU'LL DISCOVER: Chapter-by-chapter breakdown (3-5 chapters with 2-3 bullets each)
4. ABOUT THE AUTHOR: Short bio with credibility indicators + placeholder photo
5. WHAT YOU GET: Complete list (ebook + formats + bonus files)
6. VALUE VS PRICE: Show time/money they'd spend on alternatives vs ebook price
7. BONUSES: 2-3 bonus items with individual values (ex: "Planilha de Controle — Valor: R$47")
8. GUARANTEE: Money-back with specific period
9. FAQ: 6 questions (common objections + tech questions like "como acesso?")
10. FINAL CTA: With price, bonuses reminder, and urgency

EBOOK-SPECIFIC RULES:
- Include a 3D book cover mockup placeholder (CSS-based skewed box)
- Emphasize "acesso imediato" and "download em minutos"
- Show reading time estimate
- Mention PDF/EPUB/MOBI formats
- Stress: "você não precisa de experiência prévia"`,
  sections: ["hero", "for-who", "contents", "author", "what-you-get", "value", "bonuses", "guarantee", "faq", "cta"],
  bestFor: ["ebooks", "guias digitais", "pdfs", "materiais educativos"],
};
