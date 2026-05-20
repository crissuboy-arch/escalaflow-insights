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
  minerador: `{"competitors":[{"name":string,"angle":string,"why":string}],"hooks":[string],"creatives":[{"type":string,"idea":string}],"vsls":[{"hook":string,"structure":string}],"offers":[{"name":string,"price":string,"bonuses":[string]}],"summary":string}`,
  analista: `{"promise":string,"audience":string,"mainPain":string,"mechanism":string,"cta":string,"funnel":string,"creativeNotes":string,"copyNotes":string,"page":string,"offerStrength":string,"overallScore":number,"scores":{"oferta":{"value":number,"strengths":[string],"weaknesses":[string],"fixes":[string],"next_action":string},"copy":{"value":number,"strengths":[string],"weaknesses":[string],"fixes":[string],"next_action":string},"criativo":{"value":number,"strengths":[string],"weaknesses":[string],"fixes":[string],"next_action":string},"funil":{"value":number,"strengths":[string],"weaknesses":[string],"fixes":[string],"next_action":string},"escala":{"value":number,"strengths":[string],"weaknesses":[string],"fixes":[string],"next_action":string}}}`,
  campanha: `{"campaigns":[{"platform":"meta"|"google"|"instagram","name":string,"audiences":[string],"angles":[string],"headlines":[string],"adCopies":[string],"creatives":[{"format":string,"idea":string}]}]}`,
  conteudo: `{"calendar":[{"day":number,"format":string,"hook":string,"caption":string,"cta":string}],"viralHooks":[string],"reels":[string],"stories":[string],"carousels":[{"title":string,"slides":[string]}]}`,
  escala: `{"d3":{"goal":string,"budget":string,"kpis":[string],"actions":[string]},"d7":{"goal":string,"budget":string,"kpis":[string],"actions":[string]},"d14":{"goal":string,"budget":string,"kpis":[string],"actions":[string]},"pauseWhen":[string],"scaleWhen":[string],"testWhen":[string]}`,
  operacional: `{"tasks":[{"title":string,"description":string,"priority":"alta"|"media"|"baixa"}]}`,
  relatorio: `{"diagnosis":string,"strengths":[string],"weaknesses":[string],"campaignSummary":string,"contentSummary":string,"scalePlan":string,"nextSteps":[string]}`,
};

export async function runAgentAi(
  agent: AgentKind,
  ctx: ProjectContext,
): Promise<Record<string, unknown>> {
  const userPrompt = [
    basePrompt(ctx),
    ctx.extra ? `Contexto adicional: ${ctx.extra}` : "",
    "",
    `Tarefa do agente "${AGENTS[agent].title}": ${AGENTS[agent].description}`,
    `Retorne ESTRITAMENTE JSON com este schema (sem texto fora do JSON): ${SCHEMAS[agent]}`,
  ]
    .filter(Boolean)
    .join("\n");

  const content = await aiChat({
    model: "google/gemini-2.5-flash",
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
  });
  const parsed = safeJSON(content);
  return (parsed && typeof parsed === "object" ? parsed : {}) as Record<string, unknown>;
}

export const ScoreDimSchema = z.object({
  value: z.coerce.number().min(0).max(100).default(0),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  fixes: z.array(z.string()).default([]),
  next_action: z.string().default(""),
});

export const ScoresSchema = z.object({
  oferta: ScoreDimSchema,
  copy: ScoreDimSchema,
  criativo: ScoreDimSchema,
  funil: ScoreDimSchema,
  escala: ScoreDimSchema,
});

export type ScoreDim = z.infer<typeof ScoreDimSchema>;