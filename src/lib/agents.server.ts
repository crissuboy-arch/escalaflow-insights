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
      try {
        return JSON.parse(m[0]);
      } catch {
        return {};
      }
    }
    return {};
  }
}

async function aiChat(body: Record<string, unknown>): Promise<string> {
  const key = getKey();
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 429) throw new Error("Limite de IA atingido. Aguarde alguns segundos.");
  if (res.status === 402)
    throw new Error("Créditos da IA esgotados. Adicione créditos no workspace.");
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`AI gateway ${res.status}: ${txt.slice(0, 200)}`);
  }
  const j = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return j.choices?.[0]?.message?.content ?? "";
}

export type AgentKind =
  | "minerador"
  | "analista"
  | "campanha"
  | "conteudo"
  | "escala"
  | "operacional"
  | "relatorio";

export const AGENTS: Record<
  AgentKind,
  { title: string; description: string; kind: string }
> = {
  minerador: {
    title: "Minerar Mercado",
    description:
      "Investiga concorrentes, anúncios, hooks, VSLs e ofertas escaladas. Resume a oportunidade.",
    kind: "analysis",
  },
  analista: {
    title: "Analisar Oferta",
    description:
      "Promessa, público, dor, mecanismo, CTA, funil, criativo, copy, página e score geral.",
    kind: "analysis",
  },
  campanha: {
    title: "Criar Campanha",
    description: "Campanhas Meta / Google / Instagram com públicos, ângulos, headlines e copies.",
    kind: "campaign",
  },
  conteudo: {
    title: "Criar Conteúdo",
    description: "Calendário 14 dias, hooks virais, reels, stories e carrosséis por nicho/idioma.",
    kind: "content",
  },
  escala: {
    title: "Plano de Escala",
    description: "Planos D3 / D7 / D14, KPIs, orçamento e quando pausar, testar ou escalar.",
    kind: "plan",
  },
  operacional: {
    title: "Criar Tarefas",
    description: "Checklist de execução com prioridades e responsáveis sugeridos.",
    kind: "tasks",
  },
  relatorio: {
    title: "Relatório Final",
    description: "Consolida diagnóstico, campanhas, conteúdo, escala e próximos passos.",
    kind: "report",
  },
};

const SYSTEM = `Você é um consultor sênior de marketing direto, tráfego pago, copywriting, funis de venda e escala de produtos digitais. Responda SEMPRE em português do Brasil e SEMPRE em JSON válido seguindo o schema solicitado, sem markdown, sem comentários, sem texto fora do JSON. Seja específico, acionável e estratégico — nunca genérico.`;

const SYSTEMS: Record<AgentKind, string> = {
  minerador: `Você é um analista de inteligência competitiva especializado em infoprodutos. Examina concorrentes com olho clínico: o que está rodando, por que está rodando, o que pode ser melhorado. Sempre em PT-BR, JSON válido, sem markdown.

REGRAS:
1. Identifique o ângulo REAL de cada concorrente (não apenas o produto).
2. Hooks devem ser específicos e acionáveis — não genéricos.
3. Sempre sinalize a oportunidade de diferenciação no summary.`,

  analista: `Você é um media buyer sênior com R$50M+ investidos em tráfego pago combinado com um consultor de CRO com 500+ funis auditados. Avalia ofertas com precisão cirúrgica.

CRITÉRIOS DE SCORE (0-100):
- 0-40: Precisa reconstrução completa
- 41-60: Problemas estruturais sérios que impedem escala
- 61-75: Funcional mas subótimo — perde margem
- 76-89: Bom com melhorias pontuais de alto impacto
- 90-100: Best-in-class — escale agora

REGRAS:
1. Cada diagnosis deve identificar O MAIOR problema específico (não "melhore o criativo").
2. Cada fix é uma ação concreta com O QUÊ, COMO e POR QUÊ.
3. next_action = a UMA coisa a fazer nas próximas 24h.
4. Sempre em PT-BR, JSON válido, sem markdown.`,

  campanha: `Você é uma agência de performance milionária especializada em Meta Ads, Google Ads e Instagram para infoprodutos.

REGRAS DE OURO:
1. NUNCA responda genérico. "Varie criativos" sem dizer COMO é falha.
2. Adapte CPM/CPC ao país real (BR/LATAM baixo, US/UK/DE alto, JP médio).
3. Especifique públicos com detalhe: interesses, faixa etária, gênero, exclusões.
4. Sempre em PT-BR, JSON válido, sem markdown.`,

  conteudo: `Você é um estrategista de conteúdo viral para infoprodutos com 100M+ views orgânicos gerados. Entende de algoritmos, padrões de engajamento e storytelling que converte.

REGRAS:
1. Cada hook deve parar o scroll em 2 segundos — específico, não genérico.
2. Formatos devem variar: reels, stories, carrosséis com propósito diferente.
3. Conecte o conteúdo ao produto sem ser óbvio (valor primeiro, oferta depois).
4. Sempre em PT-BR, JSON válido, sem markdown.`,

  escala: `Você é um growth analyst que escalou 30+ produtos de R$0 a R$1M+/mês. Combina análise de dados com estratégia de escala real.

REGRAS:
1. Cada ação por dia é ESPECÍFICA: não "aumente orçamento" mas "suba CBO para R$300/dia no conjunto X".
2. KPIs com metas numéricas concretas.
3. Defina condições de PAUSA antes de condições de escala (proteja o caixa).
4. Sempre em PT-BR, JSON válido, sem markdown.`,

  operacional: `Você é um COO de marketing com experiência em estruturar times de tráfego e lançamentos. Cria checklists executáveis que times reais conseguem seguir.

REGRAS:
1. Tarefas devem ter owner claro (criativo, copy, tráfego, tech, etc).
2. Prioridade baseada em impacto no resultado, não em urgência percebida.
3. Cada tarefa deve ser acionável hoje — não "planejamento futuro".
4. Sempre em PT-BR, JSON válido, sem markdown.`,

  relatorio: `Você é um diretor de performance que consolida dados de múltiplas frentes e traduz em decisões claras para o dono do negócio.

REGRAS:
1. O relatório deve ser lido em 3 minutos e gerar decisão imediata.
2. Diagnóstico é cirúrgico: o maior problema + a maior oportunidade.
3. Próximos passos em ordem de impacto decrescente.
4. Sempre em PT-BR, JSON válido, sem markdown.`,
};

function basePrompt(ctx: ProjectContext): string {
  return [
    `Projeto: ${ctx.title}`,
    ctx.niche ? `Nicho: ${ctx.niche}` : "",
    ctx.country ? `País: ${ctx.country}` : "",
    ctx.language ? `Idioma: ${ctx.language}` : "",
    ctx.product_type ? `Tipo de produto: ${ctx.product_type}` : "",
    ctx.briefing?.promise ? `Promessa: ${ctx.briefing.promise}` : "",
    ctx.briefing?.avatar ? `Avatar: ${ctx.briefing.avatar}` : "",
    ctx.briefing?.uniqueMechanism ? `Mecanismo: ${ctx.briefing.uniqueMechanism}` : "",
    Array.isArray(ctx.briefing?.pains) && ctx.briefing!.pains.length
      ? `Dores: ${ctx.briefing!.pains.join(" | ")}`
      : "",
    Array.isArray(ctx.briefing?.desires) && ctx.briefing!.desires.length
      ? `Desejos: ${ctx.briefing!.desires.join(" | ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export type ProjectContext = {
  title: string;
  niche?: string | null;
  country?: string | null;
  language?: string | null;
  product_type?: string | null;
  briefing?: {
    promise?: string;
    avatar?: string;
    uniqueMechanism?: string;
    pains?: string[];
    desires?: string[];
  };
  extra?: string;
};

const SCHEMAS: Record<AgentKind, string> = {
  minerador: `{
  "competitors": [{"name":string,"angle":string,"uniqueMechanism":string,"why":string,"weakness":string}],
  "hooks": [string],
  "creatives": [{"type":string,"idea":string,"whyItWorks":string}],
  "vsls": [{"hook":string,"structure":string,"estimatedDuration":string}],
  "offers": [{"name":string,"price":string,"bonuses":[string],"strength":string}],
  "differentiationOpportunity": string,
  "summary": string
}`,
  analista: `{
  "promise": string,
  "audience": string,
  "mainPain": string,
  "mechanism": string,
  "cta": string,
  "funnel": string,
  "creativeNotes": string,
  "copyNotes": string,
  "page": string,
  "offerStrength": string,
  "overallScore": number,
  "scores": {
    "oferta": {"value":number,"label":string,"diagnosis":string,"strengths":[string],"weaknesses":[string],"fixes":[string],"next_action":string,"impact":"alto"|"médio"|"baixo"},
    "copy": {"value":number,"label":string,"diagnosis":string,"strengths":[string],"weaknesses":[string],"fixes":[string],"next_action":string,"impact":"alto"|"médio"|"baixo"},
    "criativo": {"value":number,"label":string,"diagnosis":string,"strengths":[string],"weaknesses":[string],"fixes":[string],"next_action":string,"impact":"alto"|"médio"|"baixo"},
    "funil": {"value":number,"label":string,"diagnosis":string,"strengths":[string],"weaknesses":[string],"fixes":[string],"next_action":string,"impact":"alto"|"médio"|"baixo"},
    "escala": {"value":number,"label":string,"diagnosis":string,"strengths":[string],"weaknesses":[string],"fixes":[string],"next_action":string,"impact":"alto"|"médio"|"baixo"}
  },
  "priorityAction": string,
  "quickWins": [string],
  "biggestRisk": string
}`,
  campanha: `{
  "campaigns": [{
    "platform": "meta"|"google"|"instagram",
    "name": string,
    "objective": string,
    "dailyBudget": string,
    "audiences": [{"name":string,"targeting":string,"exclusions":[string]}],
    "angles": [string],
    "headlines": [string],
    "adCopies": [string],
    "hooks": [string],
    "creatives": [{"format":string,"idea":string,"hookText":string,"emotion":string}],
    "kpis": [string],
    "scaleCondition": string,
    "pauseCondition": string
  }]
}`,
  conteudo: `{
  "calendar": [{"day":number,"format":string,"hook":string,"caption":string,"cta":string,"objective":string}],
  "viralHooks": [string],
  "reels": [{"concept":string,"hook":string,"script":string,"cta":string}],
  "stories": [{"concept":string,"hook":string,"swipeUpText":string}],
  "carousels": [{"title":string,"hook":string,"slides":[string],"finalCTA":string}],
  "contentPillar": string,
  "engagementTip": string
}`,
  escala: `{
  "currentDiagnosis": string,
  "biggestBottleneck": string,
  "d3": {"goal":string,"budget":string,"kpis":[string],"actions":[string],"pauseWhen":[string],"scaleWhen":[string]},
  "d7": {"goal":string,"budget":string,"kpis":[string],"actions":[string],"pauseWhen":[string],"scaleWhen":[string]},
  "d14": {"goal":string,"budget":string,"kpis":[string],"actions":[string],"pauseWhen":[string],"scaleWhen":[string]},
  "testMatrix": [{"element":string,"hypothesis":string,"budget":string,"successMetric":string}],
  "budgetAllocation": string,
  "warningSignals": [string],
  "scaleSignals": [string]
}`,
  operacional: `{
  "tasks": [{"title":string,"description":string,"priority":"alta"|"media"|"baixa","owner":string,"dueIn":string,"impactIfSkipped":string}],
  "criticalPath": string,
  "firstActionToday": string
}`,
  relatorio: `{
  "diagnosis": string,
  "biggestBottleneck": string,
  "strengths": [string],
  "weaknesses": [string],
  "campaignSummary": string,
  "contentSummary": string,
  "scalePlan": string,
  "nextSteps": [{"action":string,"priority":"alta"|"media"|"baixa","owner":string,"impact":string}],
  "priorityAction": string,
  "estimatedROI": string
}`,
};

export async function runAgentAi(
  agent: AgentKind,
  ctx: ProjectContext,
): Promise<Record<string, unknown>> {
  const agentSystem = SYSTEMS[agent] ?? SYSTEM;

  const userPrompt = [
    basePrompt(ctx),
    ctx.extra ? `Contexto adicional: ${ctx.extra}` : "",
    "",
    `TAREFA: ${AGENTS[agent].title}`,
    `OBJETIVO: ${AGENTS[agent].description}`,
    "",
    `REGRA CRÍTICA: Seja ESPECÍFICO ao produto "${ctx.title}" no contexto fornecido acima. Nada genérico.`,
    `Retorne ESTRITAMENTE JSON com este schema (sem texto fora do JSON):`,
    SCHEMAS[agent],
  ]
    .filter(Boolean)
    .join("\n");

  const content = await aiChat({
    model: "google/gemini-2.5-flash",
    messages: [
      { role: "system", content: agentSystem },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
  });
  const parsed = safeJSON(content);
  return (parsed && typeof parsed === "object" ? parsed : {}) as Record<string, unknown>;
}

export const ScoreDimSchema = z.object({
  value: z.coerce.number().min(0).max(100).default(0),
  label: z.string().default(""),
  diagnosis: z.string().default(""),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  fixes: z.array(z.string()).default([]),
  next_action: z.string().default(""),
  impact: z.enum(["alto", "médio", "baixo"]).default("médio"),
});

export const ScoresSchema = z.object({
  oferta: ScoreDimSchema,
  copy: ScoreDimSchema,
  criativo: ScoreDimSchema,
  funil: ScoreDimSchema,
  escala: ScoreDimSchema,
});

export type ScoreDim = z.infer<typeof ScoreDimSchema>;