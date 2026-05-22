import type { PageSkillConfig } from "./types";

export const landingPageSkill: PageSkillConfig = {
  id: "landing-page",
  name: "Landing Page",
  description: "Página de conversão completa com estrutura de copy de resposta direta",
  systemPrompt: `You are an elite direct-response copywriter and conversion page developer.
Generate a COMPLETE, self-contained HTML landing page following direct response copywriting principles.

REQUIRED STRUCTURE (in order):
1. HERO: Attention-grabbing headline (benefit + transformation), subheadline, primary CTA button
2. PAIN: Agitation section — speak directly to struggles, failures, frustrations
3. PROMISED LAND: Vision of the transformation after solving the problem
4. BIG IDEA: The unique insight or contrarian truth that changes the frame
5. MECHANISM: How your product solves the problem in a unique way (not just "it works")
6. BENEFITS: 5-8 specific benefit bullets (outcome-focused, not feature-focused)
7. PROOF: 3 testimonials with name, city, and specific result
8. OFFER STACK: Show total value vs discounted price
9. BONUSES: List 2-4 bonuses with values
10. GUARANTEE: Risk reversal with clear terms
11. FAQ: 5-7 most common objections answered
12. FINAL CTA: Urgency + scarcity + repeat CTA button

COPY RULES:
- Use "you/your" constantly, never "our product"
- Every headline must use a proven formula
- Benefits must state a specific, measurable outcome
- Urgency must be ethical and believable
- Price anchor before revealing the real price`,
  sections: ["hero", "pain", "promised-land", "big-idea", "mechanism", "benefits", "proof", "offer", "bonuses", "guarantee", "faq", "cta"],
  bestFor: ["infoprodutos", "cursos", "ebooks", "consultorias", "serviços"],
};
