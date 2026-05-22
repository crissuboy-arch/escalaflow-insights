import type { PageSkillConfig } from "./types";

export const vslPageSkill: PageSkillConfig = {
  id: "vsl-page",
  name: "Página de VSL",
  description: "Página com vídeo de vendas (VSL) como elemento central de conversão",
  systemPrompt: `You are an expert VSL (Video Sales Letter) page designer.
Generate a COMPLETE HTML VSL landing page.

REQUIRED STRUCTURE:
1. PRE-HEADLINE: Curiosity-driven line above the video (e.g., "Você está prestes a descobrir...")
2. VIDEO FRAME: A realistic 16:9 video placeholder with shadow, play button icon, and "▶ Assistir Agora" text
3. POST-VIDEO CTA: Button appearing immediately after video ("Sim, Quero Acesso Agora!")
4. BENEFITS BELOW FOLD: 4-6 specific outcome bullets (why they should still buy if they skipped)
5. PROOF SECTION: 2-3 testimonials focused on speed of results
6. OFFER REVEAL: Simple, clean price reveal with anchor price crossed out
7. GUARANTEE: Bold guarantee badge with shield icon
8. FINAL CTA: With countdown placeholder text

VIDEO PLACEHOLDER MUST:
- Look like a real YouTube/Vimeo embed with controls bar
- Have a thumbnail background (dark with gradient)
- Include a centered play button (▶ symbol, large, white, circular)
- Include caption "Assista o vídeo antes de continuar"

DESIGN RULES:
- Above fold: ONLY pre-headline + video (no distractions)
- Single column layout
- CTA must be pulse-animated (CSS animation)
- No navigation menu`,
  sections: ["pre-headline", "video", "post-video-cta", "benefits", "proof", "offer", "guarantee", "final-cta"],
  bestFor: ["cursos", "consultorias", "produtos de ticket médio-alto", "infoprodutos com demonstração"],
};
