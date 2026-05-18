import { z } from "zod";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

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

async function callGateway(messages: unknown[]): Promise<string> {
  const key = getKey();
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages,
      response_format: { type: "json_object" },
    }),
  });
  if (res.status === 429) throw new Error("Limite de IA atingido. Aguarde alguns segundos.");
  if (res.status === 402) throw new Error("Créditos da IA esgotados.");
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`AI gateway ${res.status}: ${t.slice(0, 200)}`);
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content ?? "{}";
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

Se houver imagens (print do produto, da página, do anúncio ou criativos), use-as para inferir nicho, público e ângulos. Se a plataforma não foi escolhida pelo usuário, ainda preencha as 3 seções (meta/google/instagram) com recomendações.`;

  const userContent: Array<Record<string, unknown>> = [{ type: "text", text: prompt }];
  for (const url of (ctx.imageDataUrls ?? []).slice(0, 6)) {
    userContent.push({ type: "image_url", image_url: { url } });
  }
  const content = await callGateway([
    { role: "system", content: PLAN_SYSTEM },
    { role: "user", content: userContent },
  ]);
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
  ]);
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
  ]);
  return ScalePlanSchema.parse(safeJSON(content));
}

export async function aiAnalyzeScale(ctx: ScaleContext): Promise<ScaleAnalysis> {
  const key = getKey();

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

Se houver screenshot anexado, use-o como fonte primária e extraia métricas reais dele.`;

  const userContent: Array<Record<string, unknown>> = [{ type: "text", text: textPrompt }];
  if (ctx.imageDataUrl) {
    userContent.push({ type: "image_url", image_url: { url: ctx.imageDataUrl } });
  }

  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userContent },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (res.status === 429) throw new Error("Limite de IA atingido. Aguarde alguns segundos.");
  if (res.status === 402) throw new Error("Créditos da IA esgotados.");
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`AI gateway ${res.status}: ${t.slice(0, 200)}`);
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = json.choices?.[0]?.message?.content ?? "{}";
  const parsed = safeJSON(content);
  return ScaleAnalysisSchema.parse(parsed);
}