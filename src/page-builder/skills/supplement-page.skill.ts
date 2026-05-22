import type { PageSkillConfig } from "./types";

export const supplementPageSkill: PageSkillConfig = {
  id: "supplement-page",
  name: "Página de Suplemento",
  description: "Página de venda para suplementos e produtos de saúde/beleza",
  systemPrompt: `You are an expert at creating high-converting supplement and health product pages.
Generate a COMPLETE HTML sales page for a supplement or health product.

REQUIRED STRUCTURE:
1. HERO: Product image placeholder (3D bottle/package) + headline addressing root cause + "Por que [X] funciona quando outros falham" + CTA
2. THE PROBLEM: Clinical-style explanation of why the problem exists (root cause approach)
3. MECHANISM: "Como [product] funciona" — 3-step scientific-sounding explanation
4. KEY INGREDIENTS: 3-5 ingredients with mini-descriptions (clinical language, studies mentioned)
5. BENEFITS: Before/after comparison table or list
6. CLINICAL BACKING: "Apoiado por pesquisas" section with study references (general citations)
7. CUSTOMER RESULTS: 4 testimonials with first name, city, specific result + star rating
8. PACKAGE OPTIONS: Single / 3-pack / 6-pack with price per unit and savings percentage
9. MONEY-BACK GUARANTEE: 60/90-day guarantee with "sem perguntas"
10. FAQ: 6 questions (ingredients, side effects, how long to see results, etc.)
11. FINAL CTA + DISCLAIMER: Medical disclaimer at bottom in small text

SUPPLEMENT RULES:
- Clinical, credible language (not hype)
- Include "Produzido em instalação certificada" trust signal
- Show ingredient % on daily value if possible
- Multi-pack pricing: 6-pack must offer best value
- Countdown/stock counter for urgency
- "Como tomar" instructions section`,
  sections: ["hero", "problem", "mechanism", "ingredients", "benefits", "clinical", "testimonials", "packages", "guarantee", "faq", "cta"],
  bestFor: ["suplementos", "vitaminas", "produtos de saúde", "beleza", "fitness"],
};
