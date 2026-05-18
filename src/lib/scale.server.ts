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
  }).default({}),
  google: z.object({
    structure: z.string().default(""),
    campaigns: z.number().default(0),
    adGroups: z.number().default(0),
    ads: z.number().default(0),
    budgetPerCampaign: z.string().default(""),
    keywords: z.array(z.string()).default([]),
    audiences: z.array(z.string()).default([]),
  }).default({}),
  instagram: z.object({
    structure: z.string().default(""),
    formats: z.array(z.string()).default([]),
    budgetPerCampaign: z.string().default(""),
    audiences: z.array(z.string()).default([]),
  }).default({}),
  creatives: z.array(z.object({
    format: z.string().default(""),
    angle: z.string().default(""),
    description: z.string().default(""),
  })).default([]),
  copyAngles: z.array(z.string()).default([]),
  hooks: z.array(z.string()).default([]),
  cta: z.string().default(""),
  expectedKpis: z.object({
    ctr: z.string().default(""),
    cpc: z.string().default(""),
    cpm: z.string().default(""),
    cpa: z.string().default(""),
    roas: z.string().default(""),
  }).default({}),
  day1: z.string().default(""),
  day2: z.string().default(""),
  day3: z.string().default(""),
  warnings: z.array(z.string()).default([]),
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

const PLAN_SYSTEM = `Você é um gestor de tráfego sênior especialista em Meta Ads, Google Ads e Instagram Ads para infoprodutos e e-commerce. Cria planos de campanha completos e executáveis em PT-BR. Sempre responde JSON válido conforme o schema, sem markdown, sem texto fora do JSON.`;

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
  "campaignName": "...",
  "objective": "conversões | vendas | tráfego | leads | ...",
  "totalBudgetDaily": "${ctx.currencySymbol || ctx.currency || "$"} ... / dia",
  "localization": {"language":"pt-BR | en | es | ...","currency":"${ctx.currency || ""}","marketNotes":"adaptações por país/idioma"},
  "meta": {
    "structure": "explicação curta da estrutura Meta Ads",
    "campaigns": 0, "adsets": 0, "ads": 0,
    "budgetPerCampaign": "...",
    "audiences": [{"name":"...","targeting":"interesses/lookalike/idade/gênero/país"}]
  },
  "google": {
    "structure": "Search | PMax | Demand Gen | ...",
    "campaigns": 0, "adGroups": 0, "ads": 0,
    "budgetPerCampaign": "...",
    "keywords": ["..."],
    "audiences": ["..."]
  },
  "instagram": {
    "structure": "reels | stories | feed | ...",
    "formats": ["..."],
    "budgetPerCampaign": "...",
    "audiences": ["..."]
  },
  "creatives": [{"format":"reels 9:16 | imagem 1:1 | carrossel","angle":"...","description":"o que mostrar"}],
  "copyAngles": ["..."],
  "hooks": ["3-5 hooks fortes em PT-BR"],
  "cta": "...",
  "expectedKpis": {"ctr":"1.5-2.5%","cpc":"${ctx.currencySymbol || ""} ...","cpm":"${ctx.currencySymbol || ""} ...","cpa":"${ctx.currencySymbol || ""} ...","roas":"1.8-2.5"},
  "day1": "o que fazer no dia 1",
  "day2": "o que fazer no dia 2",
  "day3": "o que fazer no dia 3",
  "warnings": ["alertas: orçamento baixo, falta de pixel, etc"]
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
  return CampaignPlanSchema.parse(safeJSON(content));
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