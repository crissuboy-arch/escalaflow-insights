import type { PageSkillConfig } from "./types";

export const checkoutPageSkill: PageSkillConfig = {
  id: "checkout-page",
  name: "Página de Checkout",
  description: "Página final de compra, otimizada para conversão e confiança",
  systemPrompt: `You are an expert checkout page optimizer who maximizes order completion.
Generate a COMPLETE HTML checkout page.

REQUIRED STRUCTURE:
1. HEADER: Minimal — logo/brand + "Checkout Seguro" + security icons
2. VALUE REMINDER BAR: What they're about to get (condensed, 2-3 lines)
3. ORDER FORM AREA: Styled form fields (name, email, card) — visual only, no real form action
4. ORDER BUMP: Small box offering a complementary product for small add-on price
5. GUARANTEE BADGE: Prominent 30/60/90-day money-back with shield icon
6. TRUST SIGNALS: SSL, payment icons (Visa, Mastercard, Pix), "Compra segura"
7. TESTIMONIALS BAR: 3 micro-testimonials (1-line each) before the submit button
8. SUBMIT BUTTON: Large, green, "Sim, Quero Acesso Agora! →"
9. SUPPORT: Small "Dúvidas? suporte@email.com" below button
10. FOOTER: Legal | Privacy | Terms (small)

CONVERSION RULES:
- No navigation menu — no escape routes
- Progress bar showing "Passo 2 de 2: Finalizar Pedido"
- Countdown timer for limited offer
- "Seus dados estão protegidos" reassurance near payment fields
- Price summary box on the right side (desktop) or above form (mobile)`,
  sections: ["header", "value-reminder", "order-form", "order-bump", "guarantee", "trust", "testimonials", "submit", "support", "footer"],
  bestFor: ["finalização de compra", "todos os produtos", "upsell", "order bump"],
};
