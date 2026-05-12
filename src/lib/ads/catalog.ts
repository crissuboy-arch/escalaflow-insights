export const PLATFORMS = [
  { id: "tiktok", name: "TikTok", desc: "Vídeos verticais virais" },
  { id: "instagram", name: "Instagram", desc: "Reels, stories e feed" },
  { id: "facebook", name: "Facebook", desc: "Feed, marketplace e ads" },
  { id: "pinterest", name: "Pinterest", desc: "Pins visuais e shopping" },
  { id: "shorts", name: "Shorts (YouTube)", desc: "Vídeos curtos verticais" },
  { id: "marketplace", name: "Marketplace", desc: "Anúncios diretos" },
  { id: "amazon", name: "Amazon", desc: "PDP e listings" },
  { id: "shopee", name: "Shopee", desc: "PDP e ads de marketplace" },
] as const;

export type PlatformId = (typeof PLATFORMS)[number]["id"];

export const OBJECTIVES = [
  { id: "ctr", name: "CTR", desc: "Maximizar cliques e curiosidade" },
  { id: "conversao", name: "Conversão", desc: "Vender direto, fundo de funil" },
  { id: "viralizacao", name: "Viralização", desc: "Gerar saves, shares, comentários" },
  { id: "branding", name: "Branding", desc: "Construir marca e percepção" },
  { id: "remarketing", name: "Remarketing", desc: "Recuperar leads aquecidos" },
  { id: "escala", name: "Escala", desc: "Bater grandes volumes com CPA estável" },
] as const;

export type ObjectiveId = (typeof OBJECTIVES)[number]["id"];

export const DIMENSIONS = ["1:1", "4:5", "9:16"] as const;
export type Dimension = (typeof DIMENSIONS)[number];

export const ADS_FORMATS = [
  { id: "native-notes", name: "Native Notes", description: "Print de bloco de notas estilo iOS — confessional, próximo, alto CTR.", emocao: "intimidade", angulo: "confissão pessoal" },
  { id: "portal-noticias", name: "Portal de Notícias", description: "Mockup de manchete de portal — autoridade implícita, vira história.", emocao: "curiosidade", angulo: "notícia bombástica" },
  { id: "cupom-fiscal", name: "Cupom Fiscal", description: "Recibo/nota fiscal ilustrando ganho ou economia — prova tangível.", emocao: "prova", angulo: "evidência financeira" },
  { id: "pov-ebook", name: "POV: Ebook na Mão", description: "Câmera POV segurando o ebook/playbook — imersão e desejo.", emocao: "desejo", angulo: "POV imersivo" },
  { id: "super-headline", name: "Super Headline", description: "Headline gigante centralizada — promessa pura e específica.", emocao: "promessa", angulo: "promessa direta" },
  { id: "problema-solucao", name: "Problema vs Solução", description: "Antes/depois lado a lado com seta — clareza de transformação.", emocao: "transformação", angulo: "contraste explícito" },
  { id: "post-x", name: "Post X (Twitter)", description: "Mockup de post viral do X com curtidas e comentários.", emocao: "validação social", angulo: "tweet polêmico" },
  { id: "oferta-mockup", name: "Oferta Direta com Mockup", description: "Produto físico/digital + preço destacado + CTA claro.", emocao: "oferta", angulo: "preço imperdível" },
  { id: "ebook-promo", name: "Ebook Promo", description: "Capa do ebook em destaque + bullets dos capítulos.", emocao: "valor", angulo: "tudo que vai aprender" },
  { id: "ebook-depoimento", name: "Ebook + Depoimento", description: "Capa + screenshot de depoimento real.", emocao: "prova social", angulo: "quem já comprou" },
  { id: "procura-se", name: "Procura-se", description: "Cartaz de 'procura-se' chamando o avatar específico.", emocao: "pertencimento", angulo: "isso é para você se…" },
  { id: "traco-lapis", name: "Traço a Lápis", description: "Ilustração simples a lápis com texto manuscrito — orgânico e nativo.", emocao: "humano", angulo: "história desenhada" },
  { id: "price-anchor", name: "Price Anchor", description: "Preço cheio riscado + preço promocional gigante.", emocao: "urgência", angulo: "âncora de preço" },
  { id: "before-after", name: "Before / After", description: "Comparativo antes e depois com prazo realista.", emocao: "transformação", angulo: "resultado visível" },
  { id: "checklist", name: "Checklist", description: "Lista marcada com 5–7 itens — promessa segmentada.", emocao: "clareza", angulo: "o que você ganha" },
  { id: "micro-aula", name: "Micro Aula", description: "Reel/Short de 30s ensinando 1 dica curta + CTA pro produto.", emocao: "valor entregue", angulo: "ensina e vende" },
  { id: "manchete-jornal", name: "Manchete de Jornal", description: "Mockup de página de jornal impresso — autoridade vintage.", emocao: "autoridade", angulo: "destaque na imprensa" },
  { id: "comparativo-metodo", name: "Comparativo de Método", description: "Tabela 'método antigo vs seu método' com bullets.", emocao: "diferenciação", angulo: "por que somos diferentes" },
] as const;

export type AdsFormat = (typeof ADS_FORMATS)[number];
export type AdsFormatId = AdsFormat["id"];

export function findFormat(id: string): AdsFormat | undefined {
  return ADS_FORMATS.find((f) => f.id === id);
}
export function findPlatform(id: string) {
  return PLATFORMS.find((p) => p.id === id);
}
export function findObjective(id: string) {
  return OBJECTIVES.find((o) => o.id === id);
}