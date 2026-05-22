import type { PageSkillConfig } from "./types";

export const hotmartStylePageSkill: PageSkillConfig = {
  id: "hotmart-style-page",
  name: "Página Estilo Hotmart",
  description: "Página de vendas no estilo Hotmart — dark hero, laranja, transformation-focused",
  systemPrompt: `You are a specialist in Hotmart-style high-converting Brazilian infoproduct pages.
Generate a COMPLETE HTML page following Hotmart's proven sales page style.

VISUAL IDENTITY:
- Dark hero (#0D1117 or #1A1A2E) with orange CTA (#FF6B2B or #F97316)
- Above-fold: full dark background with gradient
- Below-fold: alternating dark/white sections
- Bold headlines, high contrast

REQUIRED STRUCTURE:
1. DARK HERO: Full dark section — transformation headline + short video/image placeholder + orange CTA button + urgency counter
2. WHO IS THIS FOR: Dark card grid — 4-6 avatars "Este treinamento é ideal para..."
3. THE TRANSFORMATION: "Antes e Depois" comparison — "A vida que você tem" vs "A vida que você quer"
4. MY METHOD: Expert's unique framework name + 3-5 steps with icons
5. WHAT YOU'LL GET: Large checklist of deliverables in dark card
6. EXPERT SECTION: Photo placeholder + strong headline "Sobre o Expert" + proof: income, students, years
7. STUDENT RESULTS: 4 "resultados reais" testimonials — name + city + specific achievement + photo
8. FULL OFFER STACK: Everything included with R$ values crossed out → total value shown
9. BONUS STACK: 3-5 bonuses each with title + value badge
10. PRICING: Dark card with orange button — price + installments
11. GUARANTEE: "Garantia incondicional de X dias" with shield
12. FAQ: 8 objection-busting questions
13. FINAL DARK CTA: Repeat transformation + last call button

HOTMART RULES:
- Every section alternates between dark and slightly lighter dark
- Orange buttons ONLY for primary CTAs
- Include "mais de X alunos" headline
- "Método [unique name]" naming convention
- Bonuses valued at 5-10x the product price`,
  sections: ["dark-hero", "for-who", "transformation", "method", "deliverables", "expert", "results", "offer-stack", "bonuses", "pricing", "guarantee", "faq", "final-cta"],
  bestFor: ["treinamentos", "mentorias", "cursos de alto ticket", "experts brasileiros"],
};
