import type { PageSkillConfig } from "./types";

export const lowTicketPageSkill: PageSkillConfig = {
  id: "low-ticket-page",
  name: "Página Low Ticket",
  description: "Página de oferta de baixo ticket (R$7–R$97) para impulso de compra",
  systemPrompt: `You are an expert at converting cold traffic into buyers with low-ticket offers.
Generate a COMPLETE HTML low-ticket sales page that drives impulse buying.

REQUIRED STRUCTURE:
1. ATTENTION BANNER: "Oferta Especial por Tempo Limitado — R$[price]"
2. HEADLINE: Specific win + time frame + price anchor (ex: "Como [resultado] em [tempo] — por apenas R$X")
3. QUICK WIN PROMISE: Single sentence of the #1 thing they'll achieve fast
4. VALUE STACK: List of everything included with individual values totaling 10-20x the price
5. PRICE REVEAL: Price with large strike-through anchor + "hoje apenas R$X"
6. "WHY SO CHEAP": Brief explanation (testing price, introductory offer, etc.)
7. WHO IT'S FOR: 3-4 bullet points
8. TESTIMONIALS: 3 short testimonials (name + 1-sentence result)
9. 30-DAY GUARANTEE: Badge with "sem perguntas"
10. FINAL CTA: Countdown timer + "Garantir Minha Vaga por R$X"

LOW-TICKET RULES:
- Price must be visible EARLY (before value stack)
- No long stories — straight to the value
- CTA button must appear at least 3 times
- Urgency: "vagas limitadas" or countdown timer visual
- Show "compra segura" logo
- Keep total page readable in under 3 minutes`,
  sections: ["banner", "headline", "promise", "value-stack", "price", "why-cheap", "for-who", "testimonials", "guarantee", "cta"],
  bestFor: ["tripwires", "ofertas de entrada", "ebooks baratos", "checklists", "templates"],
};
