import type { PageSkillConfig } from "./types";

export const productPageSkill: PageSkillConfig = {
  id: "product-page",
  name: "Página de Produto Físico",
  description: "Página de venda para produtos físicos com visual de e-commerce premium",
  systemPrompt: `You are an expert e-commerce product page designer.
Generate a COMPLETE HTML product page for a physical product.

REQUIRED STRUCTURE:
1. HERO (2-column): Left: Product images placeholder (main + 4 thumbnails). Right: Product name, stars rating, price with discount badge, short description, "Adicionar ao Carrinho" button
2. KEY FEATURES: 3 icons with feature highlights (horizontal bar)
3. PRODUCT DESCRIPTION: Detailed description with sub-headlines
4. HOW IT WORKS: 3-step visual process
5. SPECIFICATIONS: Clean table with tech/physical specs
6. CUSTOMER REVIEWS: 4-5 testimonials with star ratings and verified purchase badge
7. FREQUENTLY BOUGHT TOGETHER: 2 complementary products (cross-sell)
8. GUARANTEE + SHIPPING: Promise boxes (e.g., "Entrega em 3-5 dias", "30 dias de garantia")
9. FAQ: 5 questions
10. FINAL CTA: Sticky order button on mobile

PRODUCT PAGE RULES:
- Image gallery placeholder must look like a real product gallery
- Stars must be visual (★★★★★ with half-star support)
- Include quantity selector and variant selectors (visual only)
- Show "X pessoas compraram hoje" social proof counter
- Free shipping threshold message
- Trust badges: SSL, money-back, secure payment`,
  sections: ["hero", "features", "description", "how-it-works", "specs", "reviews", "cross-sell", "guarantee", "faq", "cta"],
  bestFor: ["produtos físicos", "e-commerce", "dropshipping", "amazon", "mercadolivre"],
};
