import { z } from "zod";
import { dlog } from "./debug/log.server";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-2.5-flash";
const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // server-side defensive cap

function getKey() {
  const k = process.env.LOVABLE_API_KEY;
  if (!k) throw new Error("LOVABLE_API_KEY ausente — habilite Lovable Cloud.");
  return k;
}

function safeJSON(raw: unknown): unknown {
  if (typeof raw !== "string") return raw ?? {};
  try {
    return JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) {
      try { return JSON.parse(m[0]); } catch { return {}; }
    }
    return {};
  }
}

export const ScaleAnalysisSchema = z.object({
  diagnosis: z.string().default(""),
  winningCreative: z.string().default(""),
  winningAngle: z.string().default(""),
  fatigue: z.string().default(""),
  scaleRecommendation: z.enum(["escalar", "manter", "otimizar", "cortar"]).default("manter"),
  scaleNotes: z.string().default(""),
  metrics: z.object({
    ctr: z.string().default(""),
    cpc: z.string().default(""),
    cpm: z.string().default(""),
    roas: z.string().default(""),
    frequencia: z.string().default(""),
  }).default({}),
  nextTests: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
});
export type ScaleAnalysis = z.infer<typeof ScaleAnalysisSchema>;

// ============= Campaign Plan =============

export const CampaignPlanSchema = z.object({
  campaignName: z.string().default(""),
  objective: z.string().default(""),
  totalBudgetDaily: z.string().default(""),
  localization: z.object({
    language: z.string().default(""),
    currency: z.string().default(""),
    marketNotes: z.string().default(""),
  }).default({}),
  meta: z.object({
    structure: z.string().default(""),
    campaigns: z.number().default(0),
    adsets: z.number().default(0),
    ads: z.number().default(0),
    budgetPerCampaign: z.string().default(""),
    audiences: z.array(z.object({
      name: z.string().default(""),
      targeting: z.string().default(""),
    })).default([]),
    cbo: z.boolean().optional(),
    creativesPerAdset: z.number().optional(),
    budgetDistribution: z.string().optional(),
    remarketing: z.string().optional(),
    lookalike: z.string().optional(),
    coldAudience: z.string().optional(),
    exclusions: z.array(z.string()).optional(),
    idealFrequency: z.string().optional(),
  }).default({}),
  google: z.object({
    structure: z.string().default(""),
    campaigns: z.number().default(0),
    adGroups: z.number().default(0),
    ads: z.number().default(0),
    budgetPerCampaign: z.string().default(""),
    keywords: z.array(z.string()).default([]),
    audiences: z.array(z.string()).default([]),
    search: z.string().optional(),
    pmax: z.string().optional(),
    youtube: z.string().optional(),
    shopping: z.string().optional(),
    display: z.string().optional(),
    buyingIntent: z.string().optional(),
  }).default({}),
  instagram: z.object({
    structure: z.string().default(""),
    formats: z.array(z.string()).default([]),
    budgetPerCampaign: z.string().default(""),
    audiences: z.array(z.string()).default([]),
    feed: z.object({ creativeType: z.string().default(""), hook: z.string().default(""), duration: z.string().default(""), cta: z.string().default("") }).optional(),
    reels: z.object({ creativeType: z.string().default(""), hook: z.string().default(""), duration: z.string().default(""), cta: z.string().default("") }).optional(),
    stories: z.object({ creativeType: z.string().default(""), hook: z.string().default(""), duration: z.string().default(""), cta: z.string().default("") }).optional(),
  }).default({}),
  creatives: z.array(z.object({
    format: z.string().default(""),
    angle: z.string().default(""),
    description: z.string().default(""),
  })).default([]),
  creativesAdvanced: z.array(z.object({
    format: z.string().default(""),
    placement: z.string().default(""),
    type: z.string().default(""),
    hook3s: z.string().default(""),
    patternBreak: z.string().default(""),
    script: z.string().default(""),
    onScreenText: z.string().default(""),
    caption: z.string().default(""),
    cta: z.string().default(""),
    dominantEmotion: z.string().default(""),
    editStyle: z.string().default(""),
    pace: z.string().default(""),
    cuts: z.string().default(""),
    soundtrack: z.string().default(""),
    brollSuggestions: z.array(z.string()).default([]),
    viralScore: z.number().default(0),
    conversionScore: z.number().default(0),
  })).optional(),
  copyAngles: z.array(z.string()).default([]),
  hooks: z.array(z.string()).default([]),
  cta: z.string().default(""),
  expectedKpis: z.object({
    ctr: z.string().default(""),
    cpc: z.string().default(""),
    cpm: z.string().default(""),
    cpa: z.string().default(""),
    roas: z.string().default(""),
    cpmByCountry: z.array(z.object({ country: z.string().default(""), value: z.string().default("") })).optional(),
    nicheBenchmark: z.string().optional(),
  }).default({}),
  day1: z.string().default(""),
  day2: z.string().default(""),
  day3: z.string().default(""),
  warnings: z.array(z.string()).default([]),
  strategicSummary: z.string().optional(),
  visualDiagnosis: z.object({
    strengths: z.array(z.string()).default([]),
    weaknesses: z.array(z.string()).default([]),
    reducesConversion: z.array(z.string()).default([]),
    increasesTrust: z.array(z.string()).default([]),
    headline: z.string().default(""),
    subheadline: z.string().default(""),
    cta: z.string().default(""),
    colors: z.string().default(""),
    contrast: z.string().default(""),
    informationOverload: z.string().default(""),
    socialProof: z.string().default(""),
    scarcity: z.string().default(""),
    bonuses: z.string().default(""),
    blockOrder: z.string().default(""),
    promiseClarity: z.string().default(""),
    designLevel: z.string().default(""),
    visualTrust: z.string().default(""),
    mobileLegibility: z.string().default(""),
    score: z.number().default(0),
    scoreColor: z.string().default("yellow"),
  }).optional(),
  offerDiagnosis: z.object({
    promiseLevel: z.string().default(""),
    mechanismStrength: z.string().default(""),
    transformationClarity: z.string().default(""),
    perceivedValue: z.string().default(""),
    perceivedRisk: z.string().default(""),
    viralPotential: z.string().default(""),
    cpmPotential: z.string().default(""),
    ctrPotential: z.string().default(""),
    saturationLevel: z.string().default(""),
    verdict: z.string().default(""),
    urgencyLevel: z.string().default(""),
    conversionProbability: z.string().default(""),
    score: z.number().default(0),
    scoreColor: z.string().default("yellow"),
  }).optional(),
  scores: z.object({
    offer: z.object({ value: z.number().default(0), color: z.string().default("yellow"), reason: z.string().default("") }).optional(),
    creative: z.object({ value: z.number().default(0), color: z.string().default("yellow"), reason: z.string().default("") }).optional(),
    copy: z.object({ value: z.number().default(0), color: z.string().default("yellow"), reason: z.string().default("") }).optional(),
    funnel: z.object({ value: z.number().default(0), color: z.string().default("yellow"), reason: z.string().default("") }).optional(),
    page: z.object({ value: z.number().default(0), color: z.string().default("yellow"), reason: z.string().default("") }).optional(),
    scale: z.object({ value: z.number().default(0), color: z.string().default("yellow"), reason: z.string().default("") }).optional(),
  }).optional(),
  scaleByDay: z.object({
    day1: z.object({
      objective: z.string().default(""),
      expectedMetrics: z.string().default(""),
      positiveSignals: z.array(z.string()).default([]),
      negativeSignals: z.array(z.string()).default([]),
    }).optional(),
    day2: z.object({
      whenPause: z.array(z.string()).default([]),
      whenScale: z.array(z.string()).default([]),
      whenSwapCreative: z.array(z.string()).default([]),
    }).optional(),
    day3: z.object({
      decisionRules: z.array(z.string()).default([]),
      budgetIncrease: z.string().default(""),
      duplication: z.string().default(""),
      horizontalScaling: z.string().default(""),
      verticalScaling: z.string().default(""),
    }).optional(),
  }).optional(),
  criticalAlerts: z.object({
    alerts: z.array(z.string()).default([]),
    priorityImprovements: z.array(z.string()).default([]),
    biggestBottleneck: z.string().default(""),
    nextSteps: z.array(z.string()).default([]),
  }).optional(),
});
export type CampaignPlan = z.infer<typeof CampaignPlanSchema>;

export const NextTestsSchema = z.object({
  tests: z.array(z.object({
    title: z.string().default(""),
    hypothesis: z.string().default(""),
    howTo: z.string().default(""),
    budget: z.string().default(""),
    successMetric: z.string().default(""),
  })).default([]),
  notes: z.string().default(""),
});
export type NextTests = z.infer<typeof NextTestsSchema>;

export const ScalePlanSchema = z.object({
  summary: z.string().default(""),
  pause: z.array(z.string()).default([]),
  duplicate: z.array(z.string()).default([]),
  scale: z.array(z.string()).default([]),
  swapCreative: z.array(z.string()).default([]),
  adjustAudience: z.array(z.string()).default([]),
  next3Days: z.object({
    day1: z.string().default(""),
    day2: z.string().default(""),
    day3: z.string().default(""),
  }).default({}),
  warnings: z.array(z.string()).default([]),
});
export type ScalePlan = z.infer<typeof ScalePlanSchema>;

// ============= Extracted Creative Context (Stage A) =============

export const CreativeContextSchema = z.object({
  headline: z.string().default(""),
  subheadline: z.string().default(""),
  cta: z.string().default(""),
  priceVisible: z.string().default(""),
  bonuses: z.array(z.string()).default([]),
  socialProof: z.string().default(""),
  guarantees: z.string().default(""),
  layout: z.string().default(""),
  creatives: z.array(z.object({
    format: z.string().default(""),
    angle: z.string().default(""),
    hook: z.string().default(""),
    onScreenText: z.string().default(""),
  })).default([]),
  metricsSeen: z.object({
    ctr: z.string().default(""),
    cpc: z.string().default(""),
    cpm: z.string().default(""),
    roas: z.string().default(""),
    spend: z.string().default(""),
  }).default({}),
  notes: z.string().default(""),
});
export type CreativeContext = z.infer<typeof CreativeContextSchema>;

export type CampaignPlanContext = {
  productName?: string;
  pageUrl?: string;
  price?: string;
  currency?: string;
  currencySymbol?: string;
  countries?: string[];
  countryCodes?: string[];
  platforms?: string[];
  dailyBudget?: string;
  offerText?: string;
  imageDataUrls?: string[]; // product, page, ad, creatives
  extractedContext?: CreativeContext; // from stage A (preferred)
};

export type ScaleContext = {
  productName?: string;
  niche?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
  roas?: string;
  frequencia?: string;
  spend?: string;
  daysRunning?: string;
  notes?: string;
  imageDataUrl?: string; // optional screenshot (base64 data URL)
};

const SYSTEM = `Você é um media buyer sênior especialista em Facebook/Instagram Ads para infoprodutos. Lê métricas e screenshots do gerenciador de anúncios e devolve diagnóstico claro em PT-BR. Sempre responde JSON válido conforme o schema, sem markdown.`;

const PLAN_SYSTEM = `Você é uma agência de performance milionária especializada em escala de infoprodutos. Atua simultaneamente como: media buyer sênior (Meta/Google/Instagram/TikTok), copywriter direct-response, estrategista de funil, analista de CRO e growth hacker.

REGRAS DE OURO:
1. NUNCA responda como ChatGPT genérico. Nada de "varie criativos", "teste públicos", "use copy persuasiva" sem detalhar O QUE, COMO e POR QUÊ.
2. Sempre adapte CPM/CPC/CPA/ROAS ao país real do mercado (BR/LATAM CPM baixo, US/UK/DE/CH altos, JP médio-alto, IN baixo) e ao ticket do produto (low-ticket <R$100, mid R$100-997, high >R$997).
3. Diagnostique antes de planejar: oferta, criativo, copy, página, funil, escala.
4. Use linguagem de quem opera: "CBO com 3 conjuntos de R$50, criativo principal hook 0-3s mostrando antes/depois, exclusão de compradores 180d".
5. Sempre devolva JSON válido completo, sem markdown, sem texto fora do JSON.`;

type GatewayOpts = { model?: string; timeoutMs?: number; retries?: number; tag?: string };

async function callGateway(messages: unknown[], opts: GatewayOpts = {}): Promise<string> {
  const key = getKey();
  const model = opts.model ?? DEFAULT_MODEL;
  const timeoutMs = opts.timeoutMs ?? 110_000;
  const retries = opts.retries ?? 2;
  const tag = opts.tag ?? "ai";

  let lastErr: Error | null = null;
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    const ctrl = new AbortController();
    const t0 = Date.now();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      dlog("hydrate", `${tag}.start`, { model, attempt, timeoutMs });
      const res = await fetch(GATEWAY_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages,
          response_format: { type: "json_object" },
        }),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      const ms = Date.now() - t0;
      if (res.status === 429) {
        dlog("read-fail", `${tag}.429`, { attempt, ms });
        if (attempt <= retries) { await sleep(1000 * attempt + 500); continue; }
        throw new Error("Limite de IA atingido. Aguarde alguns segundos.");
      }
      if (res.status === 402) throw new Error("Créditos da IA esgotados.");
      if (res.status >= 500 || res.status === 408) {
        dlog("read-fail", `${tag}.${res.status}`, { attempt, ms });
        if (attempt <= retries) { await sleep(1000 * attempt); continue; }
        const t = await res.text().catch(() => "");
        throw new Error(`AI gateway ${res.status}: ${t.slice(0, 200)}`);
      }
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`AI gateway ${res.status}: ${t.slice(0, 200)}`);
      }
      const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      dlog("hydrate", `${tag}.ok`, { model, attempt, ms });
      return json.choices?.[0]?.message?.content ?? "{}";
    } catch (err) {
      clearTimeout(timer);
      const ms = Date.now() - t0;
      const isAbort = (err as Error)?.name === "AbortError";
      lastErr = err instanceof Error ? err : new Error(String(err));
      dlog("read-fail", `${tag}.${isAbort ? "timeout" : "error"}`, { attempt, ms, msg: lastErr.message });
      if (attempt <= retries && (isAbort || /network|fetch|ECONN|ETIMEDOUT/i.test(lastErr.message))) {
        await sleep(1000 * attempt);
        continue;
      }
      if (isAbort) throw new Error("A IA demorou demais para responder. Tente novamente ou reduza o nº de imagens.");
      throw lastErr;
    }
  }
  throw lastErr ?? new Error("AI gateway: falha desconhecida");
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

function capImages(urls: string[] | undefined): string[] {
  if (!urls?.length) return [];
  const out: string[] = [];
  for (const u of urls.slice(0, 6)) {
    // base64 size estimate
    const i = u.indexOf(",");
    const b64 = i >= 0 ? u.slice(i + 1) : u;
    const bytes = Math.floor((b64.length * 3) / 4);
    if (bytes > MAX_IMAGE_BYTES) {
      dlog("read-fail", "image.skip_oversized", { bytes });
      continue;
    }
    out.push(u);
  }
  return out;
}

// ============= Stage A: extract creative context from images =============

const EXTRACT_SYSTEM = `Você é um analista de marketing direto. Faz OCR e leitura visual de prints de páginas de venda, checkout, anúncios, criativos e gerenciador de tráfego. Responde JSON válido conforme o schema, sem markdown.`;

export async function aiExtractCreativeContext(args: {
  imageDataUrls: string[];
  pageUrl?: string;
  price?: string;
  offerText?: string;
}): Promise<CreativeContext> {
  const images = capImages(args.imageDataUrls);
  if (!images.length) return CreativeContextSchema.parse({});

  const prompt = `Leia TODAS as imagens anexadas (página de vendas, checkout, anúncios, criativos, métricas do gerenciador) e extraia em JSON:
{
  "headline":"título principal visível",
  "subheadline":"sub-headline",
  "cta":"texto do botão CTA",
  "priceVisible":"preço com símbolo da moeda",
  "bonuses":["bônus 1","..."],
  "socialProof":"depoimentos/selos/números visíveis",
  "guarantees":"garantia (ex: 7 dias)",
  "layout":"descrição curta da estrutura da página (hero, oferta, bônus, FAQ...)",
  "creatives":[{"format":"reels|feed|carrossel|imagem","angle":"...","hook":"primeira frase","onScreenText":"texto sobreposto"}],
  "metricsSeen":{"ctr":"","cpc":"","cpm":"","roas":"","spend":""},
  "notes":"qualquer info relevante (preço riscado, urgência, etc)"
}
Use strings vazias se não houver dado. NÃO invente.

CONTEXTO TEXTUAL:
- URL: ${args.pageUrl || "—"}
- Preço informado: ${args.price || "—"}
- Oferta: ${args.offerText || "—"}`;

  const userContent: Array<Record<string, unknown>> = [{ type: "text", text: prompt }];
  for (const url of images) userContent.push({ type: "image_url", image_url: { url } });

  const content = await callGateway(
    [
      { role: "system", content: EXTRACT_SYSTEM },
      { role: "user", content: userContent },
    ],
    { tag: "scale.extract", timeoutMs: 90_000, retries: 1 },
  );
  return CreativeContextSchema.parse(safeJSON(content));
}

export async function aiCreateCampaignPlan(ctx: CampaignPlanContext): Promise<CampaignPlan> {
  const currencyTag = `${ctx.currency || "?"}${ctx.currencySymbol ? ` (${ctx.currencySymbol})` : ""}`;
  const intlBlock = `
INTERNACIONALIZAÇÃO (regras OBRIGATÓRIAS):
- Países-alvo: ${(ctx.countries ?? []).join(", ") || "—"} ${ctx.countryCodes?.length ? `[${ctx.countryCodes.join(",")}]` : ""}
- Moeda: use SEMPRE ${currencyTag} em orçamento, CPA, CPC, CPM, ROAS. NUNCA use outra moeda.
- Faixas de CPM/CPC devem refletir o mercado real do país (BR/LATAM CPM baixo, US/UK/DE/CH altos, JP médio-alto, IN baixo).
- Idioma da copy/hooks/CTA: idioma oficial do mercado primário (BR=PT-BR, PT=PT-PT, ES=ES, US/GB=EN, FR=FR, DE=DE, IT=IT, JP=JA, MX/AR/CL/CO/PE/UY=ES). Se múltiplos mercados, escreva no idioma do mercado dominante e adicione variações nos demais idiomas em "copyAngles".
- Para presets multi-país (LATAM, Europa, Global), gere 1 campanha por cluster e explique a segmentação por país/idioma.
- Adapte tom: ES=emocional/poético, DE=técnico/direto, US=benefício+social proof, JP=respeitoso/discreto, BR=conversacional/urgência.
- Preencha "localization" com {language, currency, marketNotes} resumindo as escolhas.

PLACEMENTS solicitados: ${(ctx.platforms ?? []).join(", ") || "Meta, Google, Instagram (default)"}
- Detalhe estrutura por placement quando o usuário escolher Reels, Stories, YouTube, PMax, Spark Ads etc.
- Se TikTok/Kwai/Pinterest/LinkedIn estiverem nos placements, gere recomendações dentro de "instagram.formats" ou "creatives" rotulando claramente a plataforma.
`;
  const extractedBlock = ctx.extractedContext
    ? `\n\nCONTEXTO EXTRAÍDO DAS IMAGENS (já com OCR/leitura visual feita):\n${JSON.stringify(ctx.extractedContext).slice(0, 4000)}`
    : "";
  const prompt = `Crie um plano de campanha de tráfego pago completo, executável, para os primeiros 3 dias.
${intlBlock}

Retorne APENAS este JSON:
{
  "strategicSummary": "diagnóstico estratégico em 2-3 frases: maior gargalo + maior oportunidade",
  "campaignName": "...",
  "objective": "conversões | vendas | tráfego | leads | ...",
  "totalBudgetDaily": "${ctx.currencySymbol || ctx.currency || "$"} ... / dia",
  "localization": {"language":"pt-BR | en | es | ...","currency":"${ctx.currency || ""}","marketNotes":"adaptações por país/idioma"},
  "meta": {
    "structure": "explicação curta da estrutura Meta Ads",
    "campaigns": 0, "adsets": 0, "ads": 0,
    "budgetPerCampaign": "...",
    "audiences": [{"name":"...","targeting":"interesses/lookalike/idade/gênero/país"}],
    "cbo": true,
    "creativesPerAdset": 3,
    "budgetDistribution": "como dividir o orçamento entre conjuntos",
    "remarketing": "quem retargetear e janelas (180d página, 75% vídeo, etc)",
    "lookalike": "% e base (LAL 1% compradores BR)",
    "coldAudience": "como prospectar tráfego frio",
    "exclusions": ["compradores 180d","leads ativos","..."],
    "idealFrequency": "1.8-2.5"
  },
  "google": {
    "structure": "Search | PMax | Demand Gen | ...",
    "campaigns": 0, "adGroups": 0, "ads": 0,
    "budgetPerCampaign": "...",
    "keywords": ["..."],
    "audiences": ["..."],
    "search": "estratégia Search específica ou vazio",
    "pmax": "estratégia PMax ou vazio",
    "youtube": "estratégia YouTube ou vazio",
    "shopping": "estratégia Shopping ou vazio",
    "display": "estratégia Display ou vazio",
    "buyingIntent": "alta | média | baixa intenção de compra"
  },
  "instagram": {
    "structure": "reels | stories | feed | ...",
    "formats": ["..."],
    "budgetPerCampaign": "...",
    "audiences": ["..."],
    "feed":    {"creativeType":"carrossel | imagem | vídeo curto","hook":"primeira frase","duration":"15s | estático","cta":"..."},
    "reels":   {"creativeType":"UGC | VSL curta | trend","hook":"0-3s","duration":"15-30s","cta":"..."},
    "stories": {"creativeType":"slide rápido | enquete | swipe-up","hook":"...","duration":"5-15s","cta":"..."}
  },
  "creatives": [{"format":"reels 9:16 | imagem 1:1 | carrossel","angle":"...","description":"o que mostrar"}],
  "creativesAdvanced": [{
    "format":"reels 9:16 | imagem 1:1 | carrossel | VSL",
    "placement":"reels | feed | stories | youtube | tiktok | search | pmax",
    "type":"ugc | vsl | reels_viral | carrossel | imagem",
    "hook3s":"primeira frase + ação visual 0-3s",
    "patternBreak":"o que quebra o padrão do feed",
    "script":"roteiro completo cena a cena",
    "onScreenText":"texto que aparece na tela",
    "caption":"legenda do post",
    "cta":"...",
    "dominantEmotion":"medo | desejo | curiosidade | raiva | esperança",
    "editStyle":"corte seco | jump cut | zoom in | b-roll intercalado",
    "pace":"rápido | médio | lento",
    "cuts":"nº aproximado de cortes",
    "soundtrack":"tipo de trilha + referência",
    "brollSuggestions":["..."],
    "viralScore": 0,
    "conversionScore": 0
  }],
  "copyAngles": ["..."],
  "hooks": ["3-5 hooks fortes em PT-BR"],
  "cta": "...",
  "expectedKpis": {
    "ctr":"faixa min-max % adaptada ao nicho/país",
    "cpc":"${ctx.currencySymbol || ""} faixa real do país",
    "cpm":"${ctx.currencySymbol || ""} faixa real do país",
    "cpa":"${ctx.currencySymbol || ""} CPA alvo baseado no ticket",
    "roas":"alvo realista 1.5-3+",
    "cpmByCountry":[{"country":"BR","value":"R$ 15-30"},{"country":"US","value":"$ 18-45"}],
    "nicheBenchmark":"benchmark resumido do nicho"
  },
  "day1": "o que fazer no dia 1",
  "day2": "o que fazer no dia 2",
  "day3": "o que fazer no dia 3",
  "warnings": ["alertas: orçamento baixo, falta de pixel, etc"],
  "visualDiagnosis": {
    "strengths":["..."],"weaknesses":["..."],"reducesConversion":["..."],"increasesTrust":["..."],
    "headline":"avaliação do headline","subheadline":"...","cta":"avaliação do CTA","colors":"paleta dominante e crítica",
    "contrast":"alto/médio/baixo + crítica","informationOverload":"sim/não + onde","socialProof":"presença e força",
    "scarcity":"presença e tipo","bonuses":"clareza e atratividade","blockOrder":"ordem dos blocos e se faz sentido",
    "promiseClarity":"clareza da promessa","designLevel":"amador | intermediario | profissional",
    "visualTrust":"confiança transmitida","mobileLegibility":"legibilidade mobile",
    "score": 0, "scoreColor":"green | yellow | red"
  },
  "offerDiagnosis": {
    "promiseLevel":"...","mechanismStrength":"...","transformationClarity":"...","perceivedValue":"...",
    "perceivedRisk":"...","viralPotential":"alto/medio/baixo","cpmPotential":"...","ctrPotential":"...","saturationLevel":"...",
    "verdict":"fraca | media | forte","urgencyLevel":"...","conversionProbability":"...",
    "score": 0, "scoreColor":"green | yellow | red"
  },
  "scores": {
    "offer":   {"value":0,"color":"green|yellow|red","reason":"..."},
    "creative":{"value":0,"color":"green|yellow|red","reason":"..."},
    "copy":    {"value":0,"color":"green|yellow|red","reason":"..."},
    "funnel":  {"value":0,"color":"green|yellow|red","reason":"..."},
    "page":    {"value":0,"color":"green|yellow|red","reason":"..."},
    "scale":   {"value":0,"color":"green|yellow|red","reason":"..."}
  },
  "scaleByDay": {
    "day1": {"objective":"...","expectedMetrics":"CTR/CPM/CPA/ROAS esperados","positiveSignals":["..."],"negativeSignals":["..."]},
    "day2": {"whenPause":["regra exata"],"whenScale":["regra exata"],"whenSwapCreative":["regra exata"]},
    "day3": {"decisionRules":["..."],"budgetIncrease":"% por dia","duplication":"quando duplicar","horizontalScaling":"como","verticalScaling":"como"}
  },
  "criticalAlerts": {
    "alerts":["o que está impedindo escalar AGORA"],
    "priorityImprovements":["melhorias por ordem de impacto"],
    "biggestBottleneck":"o maior gargalo em 1 frase",
    "nextSteps":["próximas 3-5 ações concretas"]
  }
}

CONTEXTO:
Produto: ${ctx.productName || "—"}
Página: ${ctx.pageUrl || "—"}
Preço: ${ctx.price || "—"} ${currencyTag}
Orçamento diário disponível: ${ctx.dailyBudget || "—"} (${ctx.currency || ""})
Texto da oferta: ${ctx.offerText || "—"}
${extractedBlock}

${ctx.extractedContext ? "Use o CONTEXTO EXTRAÍDO acima como fonte primária — não precisa reler imagens." : "Se houver imagens anexadas, faça OCR e leitura visual antes de gerar."}
Se a plataforma não foi escolhida pelo usuário, ainda preencha as 3 seções (meta/google/instagram) com recomendações.`;

  const userContent: Array<Record<string, unknown>> = [{ type: "text", text: prompt }];
  // Only attach images if no pre-extracted context was passed (fallback path)
  if (!ctx.extractedContext) {
    for (const url of capImages(ctx.imageDataUrls)) {
      userContent.push({ type: "image_url", image_url: { url } });
    }
  }
  const content = await callGateway([
    { role: "system", content: PLAN_SYSTEM },
    { role: "user", content: userContent },
  ], { tag: "scale.plan", timeoutMs: 110_000, retries: 2 });
  return CampaignPlanSchema.parse(normalizeCampaignPlan(safeJSON(content)));
}

// The AI occasionally returns numbers where we expect strings, or a single
// string where we expect an array of strings. Normalize a few well-known
// hotspots before Zod parsing so the whole plan isn't dropped over one cell.
function normalizeCampaignPlan(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const data = raw as Record<string, unknown>;

  const toStr = (v: unknown): string => {
    if (v == null) return "";
    if (typeof v === "string") return v;
    if (typeof v === "number" || typeof v === "boolean") return String(v);
    try { return JSON.stringify(v); } catch { return ""; }
  };
  const toStrArr = (v: unknown): string[] => {
    if (Array.isArray(v)) return v.map((x) => toStr(x)).filter(Boolean);
    if (v == null || v === "") return [];
    if (typeof v === "string") {
      return v.split(/\r?\n|;|•|·/).map((s) => s.trim()).filter(Boolean);
    }
    return [toStr(v)];
  };
  const toNum = (v: unknown): number => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const n = Number(v.replace(",", ".").replace(/[^\d.\-]/g, ""));
      return Number.isFinite(n) ? n : 0;
    }
    return 0;
  };

  // creativesAdvanced[*]: string fields the AI sometimes returns as numbers
  const adv = data.creativesAdvanced;
  if (Array.isArray(adv)) {
    data.creativesAdvanced = adv.map((item) => {
      if (!item || typeof item !== "object") return item;
      const it = item as Record<string, unknown>;
      for (const k of [
        "format","placement","type","hook3s","patternBreak","script",
        "onScreenText","caption","cta","dominantEmotion","editStyle",
        "pace","cuts","soundtrack",
      ]) it[k] = toStr(it[k]);
      it.brollSuggestions = toStrArr(it.brollSuggestions);
      it.viralScore = toNum(it.viralScore);
      it.conversionScore = toNum(it.conversionScore);
      return it;
    });
  }

  // scaleByDay.day{1,2,3}: arrays the AI sometimes flattens to a string
  const sbd = data.scaleByDay as Record<string, unknown> | undefined;
  if (sbd && typeof sbd === "object") {
    const d1 = sbd.day1 as Record<string, unknown> | undefined;
    if (d1 && typeof d1 === "object") {
      d1.positiveSignals = toStrArr(d1.positiveSignals);
      d1.negativeSignals = toStrArr(d1.negativeSignals);
      d1.objective = toStr(d1.objective);
      d1.expectedMetrics = toStr(d1.expectedMetrics);
    }
    const d2 = sbd.day2 as Record<string, unknown> | undefined;
    if (d2 && typeof d2 === "object") {
      d2.whenPause = toStrArr(d2.whenPause);
      d2.whenScale = toStrArr(d2.whenScale);
      d2.whenSwapCreative = toStrArr(d2.whenSwapCreative);
    }
    const d3 = sbd.day3 as Record<string, unknown> | undefined;
    if (d3 && typeof d3 === "object") {
      d3.decisionRules = toStrArr(d3.decisionRules);
      for (const k of ["budgetIncrease","duplication","horizontalScaling","verticalScaling"]) {
        d3[k] = toStr(d3[k]);
      }
    }
  }

  // criticalAlerts.* arrays
  const ca = data.criticalAlerts as Record<string, unknown> | undefined;
  if (ca && typeof ca === "object") {
    ca.alerts = toStrArr(ca.alerts);
    ca.priorityImprovements = toStrArr(ca.priorityImprovements);
    ca.nextSteps = toStrArr(ca.nextSteps);
    ca.biggestBottleneck = toStr(ca.biggestBottleneck);
  }

  // Top-level arrays
  data.copyAngles = toStrArr(data.copyAngles);
  data.hooks = toStrArr(data.hooks);
  data.warnings = toStrArr(data.warnings);

  // visualDiagnosis / offerDiagnosis: score may come as string
  for (const k of ["visualDiagnosis","offerDiagnosis"] as const) {
    const d = data[k] as Record<string, unknown> | undefined;
    if (d && typeof d === "object") {
      if ("score" in d) d.score = toNum(d.score);
      if (k === "visualDiagnosis") {
        d.strengths = toStrArr(d.strengths);
        d.weaknesses = toStrArr(d.weaknesses);
        d.reducesConversion = toStrArr(d.reducesConversion);
        d.increasesTrust = toStrArr(d.increasesTrust);
      }
    }
  }

  // scores.*.value may come as string
  const sc = data.scores as Record<string, unknown> | undefined;
  if (sc && typeof sc === "object") {
    for (const k of Object.keys(sc)) {
      const s = sc[k] as Record<string, unknown> | undefined;
      if (s && typeof s === "object" && "value" in s) s.value = toNum(s.value);
    }
  }

  return data;
}

export async function aiNextTests(args: {
  plan?: CampaignPlan | null;
  analysis?: ScaleAnalysis | null;
  notes?: string;
}): Promise<NextTests> {
  const prompt = `Com base no plano e/ou análise abaixo, sugira 3-6 testes prioritários para a próxima rodada. Retorne APENAS este JSON:
{
  "tests": [{"title":"...","hypothesis":"...","howTo":"passo a passo","budget":"R$/dia","successMetric":"CTR>2% / CPA<R$X / ROAS>2"}],
  "notes": "observações gerais"
}

IMPORTANTE: mantenha a MOEDA e o IDIOMA do plano (campo "localization"). Não troque a moeda do orçamento.

PLANO ATUAL: ${args.plan ? JSON.stringify(args.plan).slice(0, 3000) : "—"}
ÚLTIMA ANÁLISE: ${args.analysis ? JSON.stringify(args.analysis).slice(0, 3000) : "—"}
NOTAS: ${args.notes || "—"}`;

  const content = await callGateway([
    { role: "system", content: PLAN_SYSTEM },
    { role: "user", content: prompt },
  ], { tag: "scale.nextTests", timeoutMs: 60_000, retries: 2 });
  return NextTestsSchema.parse(safeJSON(content));
}

export async function aiScalePlan(args: {
  plan?: CampaignPlan | null;
  analysis?: ScaleAnalysis | null;
  notes?: string;
}): Promise<ScalePlan> {
  const prompt = `Com base no plano e/ou análise abaixo, gere um plano de escala concreto para os próximos 3 dias.
Diga o que pausar, duplicar, escalar (2x/CBO), trocar criativo e ajustar público. Retorne APENAS este JSON:
{
  "summary": "resumo da decisão",
  "pause": ["..."],
  "duplicate": ["..."],
  "scale": ["..."],
  "swapCreative": ["..."],
  "adjustAudience": ["..."],
  "next3Days": {"day1":"...","day2":"...","day3":"..."},
  "warnings": ["..."]
}

IMPORTANTE: mantenha a MOEDA e o IDIOMA do plano (campo "localization"). Adapte recomendações ao(s) país(es)-alvo.

PLANO: ${args.plan ? JSON.stringify(args.plan).slice(0, 3000) : "—"}
ANÁLISE: ${args.analysis ? JSON.stringify(args.analysis).slice(0, 3000) : "—"}
NOTAS: ${args.notes || "—"}`;

  const content = await callGateway([
    { role: "system", content: PLAN_SYSTEM },
    { role: "user", content: prompt },
  ], { tag: "scale.scalePlan", timeoutMs: 60_000, retries: 2 });
  return ScalePlanSchema.parse(safeJSON(content));
}

export async function aiAnalyzeScale(ctx: ScaleContext): Promise<ScaleAnalysis> {
  const textPrompt = `Analise a performance abaixo e devolva APENAS este JSON:
{
  "diagnosis": "<resumo do que está acontecendo>",
  "winningCreative": "<qual criativo está vencendo e por quê>",
  "winningAngle": "<ângulo de copy vencedor>",
  "fatigue": "<sinais de fadiga: frequência, queda de CTR etc>",
  "scaleRecommendation": "escalar | manter | otimizar | cortar",
  "scaleNotes": "<como executar a recomendação: 2x budget, duplicar, mudar criativo, pausar...>",
  "metrics": { "ctr": "...", "cpc": "...", "cpm": "...", "roas": "...", "frequencia": "..." },
  "nextTests": ["<teste 1>", "<teste 2>", "<teste 3>"],
  "warnings": ["<alertas: orçamento baixo, sem dados suficientes, etc>"]
}

CONTEXTO:
Produto: ${ctx.productName || "—"}
Nicho: ${ctx.niche || "—"}
CTR: ${ctx.ctr || "—"}
CPC: ${ctx.cpc || "—"}
CPM: ${ctx.cpm || "—"}
ROAS: ${ctx.roas || "—"}
Frequência: ${ctx.frequencia || "—"}
Gasto: ${ctx.spend || "—"}
Dias rodando: ${ctx.daysRunning || "—"}
Notas / resultados colados: ${ctx.notes || "—"}

Se houver screenshot do Gerenciador anexado, use-o como fonte primária: faça OCR e extraia CTR, CPC, CPM, ROAS, frequência, gasto, dias rodando, nome do criativo vencedor e qualquer indicador visível. Confronte com os campos preenchidos pelo usuário e prefira os valores do print quando divergirem.`;

  const userContent: Array<Record<string, unknown>> = [{ type: "text", text: textPrompt }];
  if (ctx.imageDataUrl) {
    for (const url of capImages([ctx.imageDataUrl])) {
      userContent.push({ type: "image_url", image_url: { url } });
    }
  }
  const content = await callGateway(
    [
      { role: "system", content: SYSTEM },
      { role: "user", content: userContent },
    ],
    { tag: "scale.analyze", timeoutMs: 90_000, retries: 2 },
  );
  return ScaleAnalysisSchema.parse(safeJSON(content));
}

// ============= Full Diagnosis (Modo Consultor) =============

export const FullDiagnosisSchema = z.object({
  strategicSummary: z.string().default(""),
  visualDiagnosis: z.object({
    strengths: z.array(z.string()).default([]),
    weaknesses: z.array(z.string()).default([]),
    reducesConversion: z.array(z.string()).default([]),
    increasesTrust: z.array(z.string()).default([]),
    score: z.number().default(0),
    scoreColor: z.string().default("yellow"),
    notes: z.string().default(""),
  }).default({}),
  offerDiagnosis: z.object({
    verdict: z.string().default(""),
    promiseLevel: z.string().default(""),
    mechanismStrength: z.string().default(""),
    transformationClarity: z.string().default(""),
    perceivedValue: z.string().default(""),
    perceivedRisk: z.string().default(""),
    viralPotential: z.string().default(""),
    saturationLevel: z.string().default(""),
    score: z.number().default(0),
    scoreColor: z.string().default("yellow"),
  }).default({}),
  scores: z.object({
    offer:    z.object({ value: z.number().default(0), color: z.string().default("yellow"), reason: z.string().default("") }).default({}),
    creative: z.object({ value: z.number().default(0), color: z.string().default("yellow"), reason: z.string().default("") }).default({}),
    copy:     z.object({ value: z.number().default(0), color: z.string().default("yellow"), reason: z.string().default("") }).default({}),
    funnel:   z.object({ value: z.number().default(0), color: z.string().default("yellow"), reason: z.string().default("") }).default({}),
    page:     z.object({ value: z.number().default(0), color: z.string().default("yellow"), reason: z.string().default("") }).default({}),
    scale:    z.object({ value: z.number().default(0), color: z.string().default("yellow"), reason: z.string().default("") }).default({}),
  }).default({}),
  criticalAlerts: z.object({
    alerts: z.array(z.string()).default([]),
    priorityImprovements: z.array(z.string()).default([]),
    biggestBottleneck: z.string().default(""),
    nextSteps: z.array(z.string()).default([]),
  }).default({}),
});
export type FullDiagnosis = z.infer<typeof FullDiagnosisSchema>;

const DIAG_SYSTEM = `Você é o head de performance de uma agência top-tier de infoprodutos. Faz diagnóstico cirúrgico de oferta, criativo, copy, página, funil e potencial de escala. Aponta o MAIOR gargalo e o que destravar para escalar. Sempre PT-BR, JSON válido, sem markdown.`;

export async function aiFullDiagnosis(args: {
  context?: CreativeContext;
  productName?: string;
  pageUrl?: string;
  price?: string;
  currency?: string;
  countries?: string[];
  niche?: string;
  offerText?: string;
  briefing?: string;
  history?: unknown;
}): Promise<FullDiagnosis> {
  const ctxJson = args.context ? JSON.stringify(args.context).slice(0, 4000) : "—";
  const histJson = args.history ? JSON.stringify(args.history).slice(0, 2000) : "—";
  const prompt = `Faça um DIAGNÓSTICO COMPLETO desta operação para identificar o maior gargalo de escala e o que mudar primeiro.

Retorne APENAS este JSON:
{
  "strategicSummary":"2-3 frases: situação atual + maior gargalo + maior oportunidade",
  "visualDiagnosis":{
    "strengths":["..."],"weaknesses":["..."],
    "reducesConversion":["..."],"increasesTrust":["..."],
    "score":0,"scoreColor":"green|yellow|red",
    "notes":"observações da página/criativos"
  },
  "offerDiagnosis":{
    "verdict":"fraca|media|forte",
    "promiseLevel":"...","mechanismStrength":"...","transformationClarity":"...",
    "perceivedValue":"...","perceivedRisk":"...","viralPotential":"...","saturationLevel":"...",
    "score":0,"scoreColor":"green|yellow|red"
  },
  "scores":{
    "offer":   {"value":0,"color":"green|yellow|red","reason":"..."},
    "creative":{"value":0,"color":"green|yellow|red","reason":"..."},
    "copy":    {"value":0,"color":"green|yellow|red","reason":"..."},
    "funnel":  {"value":0,"color":"green|yellow|red","reason":"..."},
    "page":    {"value":0,"color":"green|yellow|red","reason":"..."},
    "scale":   {"value":0,"color":"green|yellow|red","reason":"..."}
  },
  "criticalAlerts":{
    "alerts":["o que está impedindo escala AGORA"],
    "priorityImprovements":["lista por ordem de impacto"],
    "biggestBottleneck":"o maior gargalo em 1 frase",
    "nextSteps":["3-5 próximas ações concretas"]
  }
}

REGRAS: cor "green" para score 75+, "yellow" para 50-74, "red" para <50. Adapte CPM/CPC/CPA ao país real. NÃO use respostas genéricas.

CONTEXTO TEXTUAL:
- Produto: ${args.productName || "—"}
- Nicho: ${args.niche || "—"}
- Países: ${(args.countries ?? []).join(", ") || "—"}
- Preço: ${args.price || "—"} ${args.currency || ""}
- URL: ${args.pageUrl || "—"}
- Oferta: ${args.offerText || "—"}
- Briefing: ${args.briefing || "—"}

CONTEXTO EXTRAÍDO DAS IMAGENS (OCR + leitura visual):
${ctxJson}

HISTÓRICO DE PLANOS/ANÁLISES ANTERIORES (compare evolução se houver):
${histJson}`;

  const content = await callGateway(
    [
      { role: "system", content: DIAG_SYSTEM },
      { role: "user", content: prompt },
    ],
    { tag: "scale.fullDiagnosis", timeoutMs: 110_000, retries: 2 },
  );
  return FullDiagnosisSchema.parse(safeJSON(content));
}