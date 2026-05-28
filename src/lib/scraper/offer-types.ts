/**
 * Shared types and AI prompt builder for the Open Source Scraper.
 * This file is CLIENT-SAFE — no Node.js or Playwright imports.
 */

// ── Shared types ───────────────────────────────────────────────────────────────

export interface PublicOfferData {
  title: string;
  url: string;
  metaDescription: string;
  headings: {
    h1: string[];
    h2: string[];
    h3: string[];
  };
  paragraphs: string[];
  buttons: string[];
  links: Array<{ text: string; href: string }>;
  images: Array<{ src: string; alt: string }>;
  prices: string[];
  visibleText: string;
  scrapedAt: string;
}

export interface ScrapeSuccess {
  success: true;
  data: PublicOfferData;
}

export interface ScrapeFailure {
  success: false;
  error: string;
  code?: string;
}

export type PublicScrapeResult = ScrapeSuccess | ScrapeFailure;

// ── AI prompt builder ──────────────────────────────────────────────────────────

/**
 * Transforms scraped data into a structured prompt for any LLM.
 * Feed the return value directly into your AI completion call.
 */
export function prepareScrapeForAI(data: PublicOfferData): string {
  const allHeadings = [
    ...data.headings.h1.map((h) => `H1: ${h}`),
    ...data.headings.h2.slice(0, 6).map((h) => `H2: ${h}`),
    ...data.headings.h3.slice(0, 4).map((h) => `H3: ${h}`),
  ].join("\n");

  return `ANÁLISE DE OFERTA — DADOS CAPTURADOS VIA SCRAPER
=================================================
URL: ${data.url}
Capturado em: ${new Date(data.scrapedAt).toLocaleString("pt-BR")}

TÍTULO DA PÁGINA:
${data.title}

META DESCRIPTION:
${data.metaDescription || "(não encontrada)"}

HEADLINES:
${allHeadings || "(nenhum)"}

CALLS TO ACTION E BOTÕES:
${data.buttons.slice(0, 10).join("\n") || "(nenhum)"}

PREÇOS ENCONTRADOS:
${data.prices.join("  |  ") || "(nenhum encontrado)"}

PARÁGRAFOS PRINCIPAIS:
${data.paragraphs.slice(0, 10).join("\n\n") || "(nenhum)"}

TEXTO VISÍVEL COMPLETO (primeiros 4000 chars):
${data.visibleText.slice(0, 4000)}

=================================================
Com base nesses dados capturados, faça uma análise completa da oferta:

1. PROMESSA PRINCIPAL — qual é o grande resultado prometido?
2. PÚBLICO-ALVO — quem é o cliente ideal dessa oferta?
3. OFERTA — o que está sendo vendido e como está estruturado?
4. MECANISMO ÚNICO — qual é o diferencial ou método exclusivo?
5. BÔNUS — quais bônus ou extras são mencionados?
6. PREÇO E CONDIÇÕES — qual é o investimento e como é apresentado?
7. CTA PRINCIPAL — qual é o apelo principal à ação?
8. ÂNGULOS DE ANÚNCIO — sugira 3 ângulos criativos para anunciar essa oferta:
   - Ângulo da Dor
   - Ângulo da Transformação
   - Ângulo da Curiosidade/Mecanismo
9. PONTOS DE MELHORIA — o que poderia ser melhorado na copy ou na oferta?
10. SCORE DE OFERTA — dê uma nota de 0 a 10 com justificativa.
`;
}
