import type { PageSkillConfig } from "./types";

export const kiwifyStylePageSkill: PageSkillConfig = {
  id: "kiwify-style-page",
  name: "Página Estilo Kiwify",
  description: "Página com design clean e moderno no estilo Kiwify — plataforma digital brasileira",
  systemPrompt: `You are a specialist in Kiwify-style high-converting sales pages.
Generate a COMPLETE HTML page following Kiwify's clean, modern aesthetic.

VISUAL IDENTITY:
- White/light gray background
- Blue/purple accent (#5522CC or #7C3AED)
- Clean cards with subtle shadows
- Inter or similar sans-serif font
- Generous white space
- Pill-shaped CTA buttons

REQUIRED STRUCTURE:
1. CLEAN HEADER: Logo placeholder + navigation links (stripped to minimum)
2. HERO: Split layout — Left: headline + subheadline + CTA | Right: product mockup/image in floating card
3. SOCIAL PROOF ROW: Stars + review count + student count (horizontal, clean)
4. BENEFITS: 3-column card grid with icon + title + description
5. FOR WHO: "Perfeito para quem..." — 4 persona cards
6. CURRICULUM/CONTENTS: Clean accordion-style module list
7. INSTRUCTOR: Clean bio card with photo placeholder + credentials badges
8. RESULTS: "Histórias de sucesso" — 3 testimonial cards with avatar + name + text
9. PRICING: Single clean pricing card (or 2-option toggle)
10. GUARANTEE: Green checkmark guarantee section
11. FAQ: Clean accordion FAQ section
12. CTA SECTION: Gradient background section with final pitch + button

KIWIFY-SPECIFIC RULES:
- Clean, trustworthy aesthetic — no aggressive sales tactics
- Smooth hover effects on all cards
- Mobile-responsive grid system
- Include "Suporte via WhatsApp" icon link`,
  sections: ["header", "hero", "social-proof", "benefits", "for-who", "contents", "instructor", "results", "pricing", "guarantee", "faq", "final-cta"],
  bestFor: ["infoprodutos", "cursos", "ebooks", "consultorias premium"],
};
