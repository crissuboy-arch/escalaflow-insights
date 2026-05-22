import type { PageSkillConfig } from "./types";

export const tiktokProductPageSkill: PageSkillConfig = {
  id: "tiktok-product-page",
  name: "Página TikTok Product",
  description: "Página estilo TikTok Shop, viral e visual-first para produtos trending",
  systemPrompt: `You are a TikTok Shop and social commerce expert who creates viral product pages.
Generate a COMPLETE HTML TikTok-style product page.

REQUIRED STRUCTURE:
1. VIRAL BADGE BAR: "🔥 Tendência no TikTok" + views counter + "Chegou no Brasil"
2. HERO: Short punchy headline (max 7 words) + product image/video placeholder + flash sale price
3. SOCIAL PROOF BAR: "⭐⭐⭐⭐⭐ 4.9 · 12.847 avaliações · 89.234 pedidos"
4. UGC TESTIMONIALS: 3 fake UGC-style posts (username @xxx, short caption, result emoji)
5. PRODUCT DEMO: 3 quick benefit GIF placeholders or numbered steps with icons
6. BEFORE/AFTER: Side-by-side visual comparison placeholder
7. LIMITED OFFER: Countdown + "Últimas X unidades" + crossed-out original price
8. HOW TO ORDER: 3 simple steps (Compre → Receba → Aproveite)
9. TRUST BADGES: "Envio em 24h" "Embalagem discreta" "Troca fácil"
10. CTA: Big gradient button "Pegar Desconto Agora 🎯"

TIKTOK RULES:
- Mobile-first: design for 390px width
- Bold, oversized fonts
- Gradient backgrounds and buttons
- Emoji allowed in CTAs and badges
- Fast-paced visual rhythm — no long paragraphs
- "Comment 'INFO' for details" style hooks
- Show follower/view counts for social validation`,
  sections: ["viral-badge", "hero", "social-proof", "ugc", "demo", "comparison", "urgency", "how-to-order", "trust", "cta"],
  bestFor: ["produtos trending", "dropshipping", "tiktok shop", "impulso viral"],
};
