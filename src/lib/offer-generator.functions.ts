import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callWithFallback, safeJSON } from "@/lib/aiService";

// ── Shared types ──────────────────────────────────────────────────────────────

export type OfferAnalysis = {
  promise: string;
  mechanism: string;
  audience: string;
  bonuses: string[];
  emotionalAngle: string;
  mainPain: string;
  mainDesire: string;
  awarenessLevel: string;
};

export type GeneratedOffer = {
  name: string;
  headline: string;
  subheadline: string;
  promise: string;
  mechanism: string;
  differentiator: string;
  targetAudience: string;
  suggestedPrice: string;
  bonuses: string[];
  guarantee: string;
  bullets: string[];
};

export type VslScript = {
  hook: string;
  problem: string;
  agitation: string;
  solution: string;
  mechanism: string;
  offer: string;
  urgency: string;
  cta: string;
  fullScript: string;
};

export type GeneratedAd = {
  format: "carrossel" | "imagem-unica" | "video";
  hook: string;
  headline: string;
  primaryText: string;
  cta: string;
};

// ── Step 1: Deep offer analysis ───────────────────────────────────────────────

const AnalyzeSchema = z.object({
  headline: z.string(),
  copy: z.string(),
  url: z.string().optional(),
  niche: z.string().optional(),
});

export const analyzeOfferFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof AnalyzeSchema>) => AnalyzeSchema.parse(d))
  .handler(async ({ data }) => {
    const prompt = `Você é um estrategista de marketing digital especialista em análise de ofertas de alto valor.

Analise esta oferta e extraia as informações estratégicas:

TÍTULO: ${data.headline}
COPY: ${data.copy}
URL: ${data.url ?? "não informada"}
NICHO: ${data.niche ?? "não especificado"}

Responda SOMENTE com JSON válido:
{
  "promise": "promessa principal em 1 frase objetiva",
  "mechanism": "mecanismo único que entrega a promessa",
  "audience": "público-alvo específico com característica demográfica e situação",
  "bonuses": ["bônus identificado 1", "bônus identificado 2"],
  "emotionalAngle": "ângulo emocional dominante (medo de perder, ganância, curiosidade, transformação, etc)",
  "mainPain": "dor principal que a oferta resolve (seja específico)",
  "mainDesire": "desejo principal que a oferta satisfaz (seja específico)",
  "awarenessLevel": "nao-ciente | problema | solucao | produto | oferta"
}`;

    const raw = await callWithFallback(prompt, { json: true, temp: 0.2 });
    return safeJSON(raw) as OfferAnalysis;
  });

// ── Step 2: Generate differentiated offer ─────────────────────────────────────

const AnalysisInput = z.object({
  promise: z.string(),
  mechanism: z.string(),
  audience: z.string(),
  bonuses: z.array(z.string()),
  emotionalAngle: z.string(),
  mainPain: z.string(),
  mainDesire: z.string(),
  awarenessLevel: z.string(),
});

const GenerateOfferSchema = z.object({
  analysis: AnalysisInput,
  niche: z.string().optional(),
  keyword: z.string().optional(),
});

export const generateNewOfferFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof GenerateOfferSchema>) => GenerateOfferSchema.parse(d))
  .handler(async ({ data }) => {
    const { analysis, niche, keyword } = data;
    const prompt = `Você é o melhor criador de ofertas irresistíveis do Brasil. Com base na análise abaixo, crie uma oferta NOVA — mesmo nicho, mesma promessa central, mas mecanismo e posicionamento únicos.

ANÁLISE DA OFERTA REFERÊNCIA:
- Promessa: ${analysis.promise}
- Mecanismo atual: ${analysis.mechanism}
- Público: ${analysis.audience}
- Dor principal: ${analysis.mainPain}
- Desejo principal: ${analysis.mainDesire}
- Ângulo emocional: ${analysis.emotionalAngle}
- Nível de consciência: ${analysis.awarenessLevel}
- Bônus identificados: ${analysis.bonuses.join(", ")}
${keyword ? `- Palavra-chave do mercado: ${keyword}` : ""}
${niche ? `- Nicho: ${niche}` : ""}

Crie uma oferta ORIGINAL com diferenciação clara. Responda SOMENTE com JSON:
{
  "name": "nome do produto (curto e impactante)",
  "headline": "headline principal poderosa e específica (máx 12 palavras)",
  "subheadline": "subheadline complementar (máx 20 palavras)",
  "promise": "promessa principal reescrita com diferenciação clara",
  "mechanism": "mecanismo único DIFERENTE do original (seja criativo)",
  "differentiator": "o que torna esta oferta única no mercado",
  "targetAudience": "público-alvo específico e qualificado",
  "suggestedPrice": "preço sugerido realista (ex: R$ 297 ou 3x R$ 99)",
  "bonuses": ["bônus 1 com valor percebido", "bônus 2 com valor percebido", "bônus 3 com valor percebido"],
  "guarantee": "tipo de garantia (ex: 7 dias incondicional)",
  "bullets": ["benefício específico 1", "benefício específico 2", "benefício específico 3", "benefício específico 4", "benefício específico 5"]
}`;

    const raw = await callWithFallback(prompt, { json: true, temp: 0.75 });
    return safeJSON(raw) as GeneratedOffer;
  });

// ── Step 3: Generate VSL script ───────────────────────────────────────────────

const GenerateVslSchema = z.object({
  offer: z.object({
    name: z.string(),
    headline: z.string(),
    promise: z.string(),
    mechanism: z.string(),
    targetAudience: z.string(),
    suggestedPrice: z.string().optional(),
    guarantee: z.string().optional(),
    bullets: z.array(z.string()).optional(),
  }),
  mainPain: z.string(),
  mainDesire: z.string(),
});

export const generateVslFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof GenerateVslSchema>) => GenerateVslSchema.parse(d))
  .handler(async ({ data }) => {
    const { offer, mainPain, mainDesire } = data;
    const prompt = `Você é o melhor roteirista de VSL do Brasil. Crie um script de vídeo de vendas que converte tráfego frio.

OFERTA:
- Produto: ${offer.name}
- Headline: ${offer.headline}
- Promessa: ${offer.promise}
- Mecanismo: ${offer.mechanism}
- Público: ${offer.targetAudience}
- Dor principal: ${mainPain}
- Desejo principal: ${mainDesire}
- Preço: ${offer.suggestedPrice ?? "a definir"}
- Garantia: ${offer.guarantee ?? "30 dias"}
- Benefícios: ${(offer.bullets ?? []).slice(0, 3).join("; ")}

Responda SOMENTE com JSON (sem markdown, sem texto extra):
{
  "hook": "primeiros 15 segundos: frase de choque que para o scroll (2-3 frases diretas)",
  "problem": "identificação do problema com detalhes que fazem o espectador se identificar (3-4 frases)",
  "agitation": "agravamento emocional: o que acontece se não resolver agora (3-4 frases viscerais)",
  "solution": "apresentação da solução como grande descoberta (3-4 frases com curiosidade)",
  "mechanism": "explicação do mecanismo único de forma simples e crível (4-5 frases)",
  "offer": "apresentação da oferta completa com preço, bônus e valor percebido (4-5 frases)",
  "urgency": "criação de urgência real e escassez (2-3 frases)",
  "cta": "chamada para ação final clara e direta (2-3 frases)",
  "fullScript": "script completo em texto corrido fluindo hook → problema → agravamento → solução → mecanismo → oferta → urgência → CTA (mínimo 500 palavras)"
}`;

    const raw = await callWithFallback(prompt, { json: true, temp: 0.7, maxTokens: 6000 });
    return safeJSON(raw) as VslScript;
  });

// ── Step 4: Generate 3 ad variations ─────────────────────────────────────────

const GenerateAdsSchema = z.object({
  offer: z.object({
    name: z.string(),
    headline: z.string(),
    promise: z.string(),
    targetAudience: z.string(),
    bullets: z.array(z.string()).optional(),
  }),
  emotionalAngle: z.string(),
});

export const generateAdsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof GenerateAdsSchema>) => GenerateAdsSchema.parse(d))
  .handler(async ({ data }) => {
    const { offer, emotionalAngle } = data;
    const prompt = `Você é especialista em anúncios de alta conversão para Facebook e Instagram. Crie 3 variações de anúncio para a oferta abaixo.

OFERTA:
- Produto: ${offer.name}
- Headline: ${offer.headline}
- Promessa: ${offer.promise}
- Público: ${offer.targetAudience}
- Ângulo emocional: ${emotionalAngle}
${offer.bullets ? `- Benefícios: ${offer.bullets.slice(0, 3).join("; ")}` : ""}

Crie 3 anúncios com formatos e ângulos diferentes. Responda SOMENTE com JSON:
{
  "ads": [
    {
      "format": "carrossel",
      "hook": "primeira linha que para o scroll (ângulo: curiosidade)",
      "headline": "título do anúncio (máx 40 caracteres)",
      "primaryText": "texto principal 150-200 palavras com story, problema e solução",
      "cta": "Saiba Mais"
    },
    {
      "format": "imagem-unica",
      "hook": "primeira linha que para o scroll (ângulo: transformação/resultado)",
      "headline": "título do anúncio (máx 40 caracteres)",
      "primaryText": "texto principal 120-160 palavras focado em benefício e prova social",
      "cta": "Quero Agora"
    },
    {
      "format": "video",
      "hook": "primeiras 3 segundos: frase de choque ou pergunta provocativa",
      "headline": "título do anúncio (máx 40 caracteres)",
      "primaryText": "texto principal 150-200 palavras usando urgência e escassez",
      "cta": "Acesse Agora"
    }
  ]
}`;

    const raw = await callWithFallback(prompt, { json: true, temp: 0.8, maxTokens: 3000 });
    const parsed = safeJSON(raw) as { ads?: GeneratedAd[] };
    return { ads: parsed.ads ?? [] };
  });
