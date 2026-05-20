import { z } from "zod";
import { generateAIJson, generateAIResponse } from "./aiService";

// ─── INPUT ────────────────────────────────────────────────────────────────────

export const StrategicInputSchema = z.object({
  productName: z.string().min(1),
  productType: z.string().default(""),
  niche: z.string().default(""),
  promise: z.string().default(""),
  avatar: z.string().default(""),
  uniqueMechanism: z.string().default(""),
  pains: z.array(z.string()).default([]),
  desires: z.array(z.string()).default([]),
  price: z.string().default(""),
  audience: z.string().default(""),
  country: z.string().default("Brasil"),
  language: z.string().default("pt-BR"),
  extra: z.string().default(""),
});
export type StrategicInput = z.infer<typeof StrategicInputSchema>;

// ─── SCORE DIMENSION (shared across modules) ──────────────────────────────────

export const ScoreDimensionSchema = z.object({
  value: z.coerce.number().min(0).max(100).default(0),
  label: z.string().default(""),
  diagnosis: z.string().default(""),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  fixes: z.array(z.string()).default([]),
  next_action: z.string().default(""),
  impact: z.enum(["alto", "médio", "baixo"]).default("médio"),
});
export type ScoreDimension = z.infer<typeof ScoreDimensionSchema>;

export const StrategicScorecardSchema = z.object({
  oferta: ScoreDimensionSchema,
  copy: ScoreDimensionSchema,
  criativo: ScoreDimensionSchema,
  funil: ScoreDimensionSchema,
  escala: ScoreDimensionSchema,
  overallScore: z.coerce.number().min(0).max(100).default(0),
  overallDiagnosis: z.string().default(""),
  priorityAction: z.string().default(""),
  quickWins: z.array(z.string()).default([]),
  biggestRisk: z.string().default(""),
});
export type StrategicScorecard = z.infer<typeof StrategicScorecardSchema>;

// ─── AVATAR ───────────────────────────────────────────────────────────────────

export const AvatarSchema = z.object({
  demographics: z.string().default(""),
  psychographics: z.string().default(""),
  mainPain: z.string().default(""),
  painOrigin: z.string().default(""),
  deepDesire: z.string().default(""),
  hiddenFear: z.string().default(""),
  currentSolution: z.string().default(""),
  whyItFailed: z.string().default(""),
  awarenessLevel: z.enum(["unaware", "problem-aware", "solution-aware", "product-aware", "most-aware"]).default("problem-aware"),
  sophisticationLevel: z.enum(["1", "2", "3", "4", "5"]).default("3"),
  internalMonologue: z.string().default(""),
  buyingTrigger: z.string().default(""),
});
export type Avatar = z.infer<typeof AvatarSchema>;

// ─── MENTAL TRIGGER ───────────────────────────────────────────────────────────

export const MentalTriggerSchema = z.object({
  trigger: z.string().default(""),
  application: z.string().default(""),
  copy: z.string().default(""),
});
export type MentalTrigger = z.infer<typeof MentalTriggerSchema>;

// ─── STRATEGIC CORE ───────────────────────────────────────────────────────────

export const StrategicCoreSchema = z.object({
  bigIdea: z.string().default(""),
  bigIdeaWhy: z.string().default(""),
  uniqueMechanism: z.string().default(""),
  mechanismExplanation: z.string().default(""),
  mechanismProof: z.string().default(""),
  promise: z.string().default(""),
  transformation: z.string().default(""),
  avatar: AvatarSchema,
  pains: z.array(z.string()).default([]),
  desires: z.array(z.string()).default([]),
  objections: z.array(z.object({ objection: z.string(), rebuttal: z.string() })).default([]),
  mentalTriggers: z.array(MentalTriggerSchema).default([]),
  headlines: z.array(z.string()).default([]),
  angles: z.array(z.string()).default([]),
});
export type StrategicCore = z.infer<typeof StrategicCoreSchema>;

// ─── OFFER STACK ─────────────────────────────────────────────────────────────

export const BonusSchema = z.object({
  name: z.string().default(""),
  description: z.string().default(""),
  perceivedValue: z.string().default(""),
  why: z.string().default(""),
  deliveryTime: z.string().default(""),
});

export const OfferStackSchema = z.object({
  mainOffer: z.string().default(""),
  deliverables: z.array(z.string()).default([]),
  bonuses: z.array(BonusSchema).default([]),
  guarantee: z.object({
    type: z.string().default(""),
    duration: z.string().default(""),
    copy: z.string().default(""),
  }).default({}),
  anchorPrice: z.string().default(""),
  finalPrice: z.string().default(""),
  urgency: z.string().default(""),
  scarcityType: z.string().default(""),
  valueStack: z.array(z.string()).default([]),
  totalPerceivedValue: z.string().default(""),
  orderBump: z.object({
    title: z.string().default(""),
    description: z.string().default(""),
    price: z.string().default(""),
    conversionTip: z.string().default(""),
  }).default({}),
  upsell: z.object({
    title: z.string().default(""),
    description: z.string().default(""),
    price: z.string().default(""),
    pitch: z.string().default(""),
  }).default({}),
  downsell: z.object({
    title: z.string().default(""),
    description: z.string().default(""),
    price: z.string().default(""),
    pitch: z.string().default(""),
  }).default({}),
  psychologicalPricing: z.string().default(""),
  valueEquation: z.string().default(""),
});
export type OfferStack = z.infer<typeof OfferStackSchema>;

// ─── VSL SCRIPT ───────────────────────────────────────────────────────────────

export const VSLScriptSchema = z.object({
  hook: z.string().default(""),
  patternInterrupt: z.string().default(""),
  openLoop: z.string().default(""),
  lead: z.string().default(""),
  painAmplification: z.string().default(""),
  bigIdeaReveal: z.string().default(""),
  story: z.string().default(""),
  uniqueMechanism: z.string().default(""),
  proof: z.string().default(""),
  offer: z.string().default(""),
  bonuses: z.string().default(""),
  valueStack: z.string().default(""),
  guarantee: z.string().default(""),
  urgency: z.string().default(""),
  cta: z.string().default(""),
  closeLoop: z.string().default(""),
  fullScript: z.string().default(""),
  durationEstimate: z.string().default(""),
});
export type VSLScript = z.infer<typeof VSLScriptSchema>;

// ─── FUNNEL MAP ───────────────────────────────────────────────────────────────

export const FunnelStageSchema = z.object({
  name: z.string().default(""),
  objective: z.string().default(""),
  copy: z.string().default(""),
  cta: z.string().default(""),
  conversionTarget: z.string().default(""),
  tools: z.array(z.string()).default([]),
});

export const EmailStepSchema = z.object({
  day: z.number().default(0),
  subject: z.string().default(""),
  objective: z.string().default(""),
  hook: z.string().default(""),
});

export const FunnelMapSchema = z.object({
  type: z.string().default(""),
  stages: z.array(FunnelStageSchema).default([]),
  trafficSources: z.array(z.string()).default([]),
  emailSequence: z.array(EmailStepSchema).default([]),
  retargetingStrategy: z.string().default(""),
  abTestPriorities: z.array(z.string()).default([]),
  estimatedConversionRates: z.string().default(""),
  biggestLeakPoint: z.string().default(""),
  cro: z.string().default(""),
});
export type FunnelMap = z.infer<typeof FunnelMapSchema>;

// ─── CREATIVE ANGLES ─────────────────────────────────────────────────────────

export const CreativeAngleSchema = z.object({
  name: z.string().default(""),
  concept: z.string().default(""),
  hook: z.string().default(""),
  headline: z.string().default(""),
  copy: z.string().default(""),
  emotion: z.string().default(""),
  format: z.string().default(""),
  targetSegment: z.string().default(""),
  mentalTrigger: z.string().default(""),
  visualDescription: z.string().default(""),
  estimatedCTR: z.string().default(""),
});
export type CreativeAngle = z.infer<typeof CreativeAngleSchema>;

export const CreativeAnglesSchema = z.object({
  angles: z.array(CreativeAngleSchema).default([]),
  winningAngle: z.string().default(""),
  testPriority: z.array(z.string()).default([]),
  hookFormula: z.string().default(""),
});
export type CreativeAngles = z.infer<typeof CreativeAnglesSchema>;

// ─── SCALE STRATEGY ───────────────────────────────────────────────────────────

export const ScaleDaySchema = z.object({
  objective: z.string().default(""),
  budget: z.string().default(""),
  actions: z.array(z.string()).default([]),
  kpis: z.array(z.string()).default([]),
  pauseConditions: z.array(z.string()).default([]),
  scaleConditions: z.array(z.string()).default([]),
});

export const TestItemSchema = z.object({
  element: z.string().default(""),
  hypothesis: z.string().default(""),
  method: z.string().default(""),
  duration: z.string().default(""),
  budget: z.string().default(""),
  successMetric: z.string().default(""),
});

export const ScaleStrategySchema = z.object({
  currentDiagnosis: z.string().default(""),
  biggestBottleneck: z.string().default(""),
  priorityAction: z.string().default(""),
  d3: ScaleDaySchema,
  d7: ScaleDaySchema,
  d14: ScaleDaySchema,
  d30: ScaleDaySchema,
  testMatrix: z.array(TestItemSchema).default([]),
  budgetAllocation: z.string().default(""),
  platformPriority: z.array(z.string()).default([]),
  warningSignals: z.array(z.string()).default([]),
  scaleSignals: z.array(z.string()).default([]),
});
export type ScaleStrategy = z.infer<typeof ScaleStrategySchema>;

// ─── SYSTEM PROMPTS ───────────────────────────────────────────────────────────

const SYSTEM_STRATEGIST = `Você é o consultor de marketing direto mais caro do mundo. Combina:
- Eugene Schwartz: massa psicológica, sofisticação do mercado, big idea que muda o jogo
- Alex Hormozi: arquitetura de oferta irresistível, stack de valor, garantia impossível de recusar
- Russell Brunson: funis de conversão, perfect webinar, storytelling de vendas
- Dan Kennedy: copy de resposta direta, headlines magnéticas, urgência real
- Rich Schefren: posicionamento único, estratégia de diferenciação, dominância de nicho

REGRAS ABSOLUTAS — VIOLÁ-LAS É FALHAR:
1. NUNCA seja genérico. Cada campo deve ser ESPECÍFICO ao produto, nicho e avatar fornecidos.
2. O mecanismo único PRECISA ter nome proprietário (ex: "Método Inversão 3R", "Sistema Funil Magnético"). Sem nome = falha.
3. A big idea deve ser disruptiva — contradiz o senso comum do nicho, mas é 100% plausível.
4. O avatar deve ter profundidade psicológica real: o que pensa às 3h da manhã, o medo que não conta para ninguém.
5. Pains e desires devem ser ESPECÍFICOS ao nicho — jamais genéricos como "quer mais dinheiro" ou "tem medo de falhar".
6. Sempre responda JSON válido, sem markdown, sem texto fora do JSON.`;

const SYSTEM_SCORECARD = `Você é um media buyer com R$50M+ investidos em tráfego pago para infoprodutos e um consultor de CRO com 500+ funis analisados.

Avalia ofertas, criativos, copys, funis e planos de escala com precisão cirúrgica.

CRITÉRIOS OBJETIVOS DE AVALIAÇÃO:
- Score 0-40: Problema estrutural grave — precisa reconstrução
- Score 41-60: Problemas sérios que impedem escala
- Score 61-75: Funcional mas subótimo — perde dinheiro
- Score 76-89: Bom com melhorias pontuais de alto impacto
- Score 90-100: Best-in-class — escale agora

REGRAS:
1. Cada diagnosis deve identificar O MAIOR problema específico (nunca "melhore o criativo").
2. Cada fix deve ser uma ação concreta com O QUÊ, COMO e POR QUÊ.
3. next_action = a UMA coisa a fazer nas próximas 24h.
4. Sempre responda JSON válido, sem markdown.`;

const SYSTEM_OFFER_ARCHITECT = `Você é o arquiteto de ofertas mais preciso do mercado digital.
Domina: Value Equation de Alex Hormozi (Resultado Sonhado × Probabilidade de Realização / Tempo × Esforço), stack de valor, ancoragem de preço, psicologia da decisão de compra.

REGRAS:
1. Cada bônus deve resolver uma objeção específica ou ampliar o desejo.
2. O stack de valor total deve ser 10x-20x o preço pedido.
3. A garantia deve ser tão forte que pareça arriscada para você, não para o cliente.
4. Order bump = complementa a compra principal (não compete).
5. Upsell = expansão natural (mais resultado com menos esforço).
6. Sempre responda JSON válido, sem markdown.`;

const SYSTEM_VSL_DIRECTOR = `Você é o roteirista de VSL mais eficaz do mercado de infoprodutos em PT-BR.
Domina a estrutura de Gary Halbert + Frank Kern + Jeff Walker aplicada a vídeo:
Hook (0-15s) → Open Loop → Identificação → Amplificação de Dor → Big Idea → Mecanismo → Prova → Oferta → Stack → Garantia → Urgência → CTA

REGRAS:
1. O hook DEVE parar o scroll em 3 segundos — use números, contradição ou promessa ousada.
2. O open loop deve criar curiosidade genuína sobre o mecanismo (não revelar tudo).
3. A seção de mecanismo deve ter nome proprietário e lógica interna clara.
4. O script completo deve soar natural quando gravado, não como texto escrito.
5. Sempre responda JSON válido, sem markdown.`;

const SYSTEM_FUNNEL_STRATEGIST = `Você é um estrategista de funis com 500+ funis construídos e R$100M+ em receita rastreada.
Analisa cada etapa do funil pelo lens de: taxa de conversão × ticket médio × LTV × CAC.

REGRAS:
1. Cada etapa do funil deve ter objetivo claro, copy específica e CTA único.
2. A sequência de e-mail deve ter hook na linha de assunto que force abertura.
3. O retargeting deve segmentar por nível de engajamento (visitou, assistiu 25%, assistiu 75%, abandonou checkout).
4. Sempre identifique o MAIOR ponto de vazamento do funil.
5. Sempre responda JSON válido, sem markdown.`;

const SYSTEM_CREATIVE_DIRECTOR = `Você é o diretor criativo de performance com mais criativos vencedores do Brasil.
Especialista em: hook 0-3s que para o scroll, padrão de interrupção, micro-storytelling, prova social nativa.

REGRAS:
1. Cada ângulo criativo deve ser DISTINTO — emoção diferente, formato diferente, público diferente.
2. O hook deve ser específico ao dedo: o leitor para porque se identifica ou fica curioso.
3. O formato deve ser o IDEAL para o ângulo (não o mais fácil de produzir).
4. Sempre indique qual ângulo tem maior probabilidade de vencer e por quê.
5. Sempre responda JSON válido, sem markdown.`;

const SYSTEM_SCALE_ANALYST = `Você é um growth analyst que escalou 30+ produtos digitais de R$0 a R$1M+/mês.
Combina análise de dados de tráfego com estratégia de escala, gestão de fadiga criativa e timing de mercado.

REGRAS:
1. O diagnóstico deve identificar o gargalo REAL (oferta, criativo, público, página, preço).
2. Cada ação por dia deve ser ESPECÍFICA: não "aumente orçamento" mas "suba CBO para R$300/dia no conjunto X".
3. A matriz de testes deve priorizar pelo maior impacto esperado × menor custo de teste.
4. Sempre defina condições de PAUSA antes de condições de escala (proteger o caixa primeiro).
5. Sempre responda JSON válido, sem markdown.`;

// ─── HELPER ───────────────────────────────────────────────────────────────────

function inputBlock(input: StrategicInput): string {
  return [
    `PRODUTO: ${input.productName}`,
    input.productType ? `TIPO: ${input.productType}` : "",
    input.niche ? `NICHO: ${input.niche}` : "",
    input.audience ? `PÚBLICO: ${input.audience}` : "",
    input.promise ? `PROMESSA ATUAL: ${input.promise}` : "",
    input.price ? `PREÇO: ${input.price}` : "",
    input.country ? `PAÍS: ${input.country}` : "",
    input.language ? `IDIOMA: ${input.language}` : "",
    input.avatar ? `AVATAR CONHECIDO: ${input.avatar}` : "",
    input.uniqueMechanism ? `MECANISMO ATUAL: ${input.uniqueMechanism}` : "",
    input.pains?.length ? `DORES CONHECIDAS: ${input.pains.join(" · ")}` : "",
    input.desires?.length ? `DESEJOS CONHECIDOS: ${input.desires.join(" · ")}` : "",
    input.extra ? `CONTEXTO EXTRA: ${input.extra}` : "",
  ].filter(Boolean).join("\n");
}

function safeZodParse<S extends z.ZodTypeAny>(schema: S, data: unknown): z.infer<S> {
  try {
    return schema.parse(data);
  } catch {
    try {
      return schema.parse({});
    } catch {
      return {} as z.infer<S>;
    }
  }
}

// ─── FUNCTIONS ────────────────────────────────────────────────────────────────

export async function generateStrategicCore(input: StrategicInput): Promise<StrategicCore> {
  const prompt = `${inputBlock(input)}

Gere a estratégia de posicionamento profunda. Seja ESPECÍFICO — este produto é "${input.productName}" no nicho "${input.niche || "informado acima"}". Nada genérico.

Retorne JSON com EXATAMENTE estes campos:
{
  "bigIdea": "a grande ideia central disruptiva que posiciona este produto de forma única (não o produto, o CONCEITO — ex: 'Não é dieta que emagrece, é reprogramar o sinal de fome do seu corpo')",
  "bigIdeaWhy": "por que esta big idea é poderosa e acreditável (2-3 frases específicas)",
  "uniqueMechanism": "nome proprietário do mecanismo (ex: 'Método Inversão Metabólica') — DEVE ter nome",
  "mechanismExplanation": "explicação em 2-3 frases de como o mecanismo funciona (lógica interna clara)",
  "mechanismProof": "como provar que funciona (dados, princípio científico, analogia poderosa)",
  "promise": "promessa principal reformulada como resultado tangível, específico e temporal (ex: 'Perder 8kg em 45 dias sem cortar carboidrato')",
  "transformation": "Antes: [estado atual exato do avatar] → Depois: [estado desejado exato após o produto]",
  "avatar": {
    "demographics": "idade, gênero, renda aproximada, localização, situação de vida atual",
    "psychographics": "valores, crenças, identidade, como se vê e quer ser visto",
    "mainPain": "a dor principal ESPECÍFICA ao nicho (não genérica)",
    "painOrigin": "de onde veio esta dor — momento ou evento que a criou",
    "deepDesire": "o desejo profundo não dito (o que realmente quer, não o que diz querer)",
    "hiddenFear": "o medo oculto por trás da dor (o que teme que aconteça se não resolver)",
    "currentSolution": "o que já tentou antes para resolver este problema",
    "whyItFailed": "por que a solução atual ou anterior falhou (razão específica)",
    "awarenessLevel": "unaware|problem-aware|solution-aware|product-aware|most-aware",
    "sophisticationLevel": "1|2|3|4|5",
    "internalMonologue": "o que pensa às 3h da manhã quando não consegue dormir por causa deste problema",
    "buyingTrigger": "o gatilho específico que o faz comprar agora (evento, dor, deadline interna)"
  },
  "pains": ["5 dores específicas ao nicho com profundidade emocional (não genéricas)"],
  "desires": ["5 desejos específicos como resultados concretos e mensuráveis"],
  "objections": [
    {"objection": "objeção real e específica", "rebuttal": "quebra direta, específica e convincente"}
  ],
  "mentalTriggers": [
    {"trigger": "nome do gatilho", "application": "como aplicar ESPECIFICAMENTE a este produto", "copy": "frase de exemplo pronta para usar"}
  ],
  "headlines": ["8 headlines distintas variando o ângulo: dor, desejo, curiosidade, prova, contra-intuitivo, específico, transformação, mecanismo"],
  "angles": ["5 ângulos criativos DISTINTOS para campanha (emoção + formato + segmento diferentes)"]
}`;

  const raw = await generateAIJson<StrategicCore>(prompt, {
    systemPrompt: SYSTEM_STRATEGIST,
    model: "google/gemini-2.5-flash",
    maxTokens: 8192,
  });
  return safeZodParse(StrategicCoreSchema, raw);
}

export async function generateScorecard(input: StrategicInput): Promise<StrategicScorecard> {
  const prompt = `${inputBlock(input)}

Avalie este produto em 5 dimensões estratégicas. Seja CIRÚRGICO — diga O QUE exatamente está fraco, não apenas que está fraco.

Retorne JSON com EXATAMENTE estes campos:
{
  "oferta": {
    "value": 0-100,
    "label": "ex: Oferta Fraca|Oferta Razoável|Oferta Forte|Oferta Irresistível",
    "diagnosis": "diagnóstico em 2-3 frases: qual é o maior problema ou força da oferta",
    "strengths": ["ponto forte 1 específico", "ponto forte 2"],
    "weaknesses": ["problema 1 específico que reduz conversão", "problema 2"],
    "fixes": ["ação concreta: O QUÊ fazer + COMO + POR QUÊ vai funcionar"],
    "next_action": "a UMA coisa a fazer nas próximas 24h",
    "impact": "alto|médio|baixo"
  },
  "copy": { (mesma estrutura, avalie headlines, copy, VSL, CTA) },
  "criativo": { (avalie hook, formato, ângulo, elementos visuais) },
  "funil": { (avalie estrutura do funil, pontos de conversão, follow-up) },
  "escala": { (avalie prontidão para escala: margem, criativo, público, sistema) },
  "overallScore": 0-100,
  "overallDiagnosis": "diagnóstico geral em 3-4 frases: maior gargalo + maior oportunidade + estado atual",
  "priorityAction": "a ação de maior impacto para os próximos 7 dias",
  "quickWins": ["3 melhorias rápidas (menos de 48h) com impacto imediato"],
  "biggestRisk": "o risco mais crítico se nada mudar"
}`;

  const raw = await generateAIJson<StrategicScorecard>(prompt, {
    systemPrompt: SYSTEM_SCORECARD,
    model: "google/gemini-2.5-flash",
    maxTokens: 6144,
  });
  return safeZodParse(StrategicScorecardSchema, raw);
}

export async function generateOfferStack(input: StrategicInput): Promise<OfferStack> {
  const prompt = `${inputBlock(input)}

Arquitete a oferta completa usando a Value Equation de Alex Hormozi:
Score de Valor = (Resultado Sonhado × Probabilidade de Realização) / (Tempo × Esforço)

O objetivo é maximizar o numerador e minimizar o denominador em cada elemento da oferta.

Retorne JSON com EXATAMENTE estes campos:
{
  "mainOffer": "descrição completa da oferta principal (o que é, o que entrega, resultado esperado) — 3-5 frases",
  "deliverables": ["item 1 do produto com formato e resultado (ex: 'Módulo 3: Sistema de Cardápio — 21 receitas que ativam o metabolismo')"],
  "bonuses": [
    {
      "name": "nome do bônus específico",
      "description": "o que entrega em 2-3 frases",
      "perceivedValue": "R$ XXX",
      "why": "qual objeção este bônus quebra ou qual desejo amplifica",
      "deliveryTime": "acesso imediato|em 7 dias|etc"
    }
  ],
  "guarantee": {
    "type": "incondicional|condicional|dupla|satisfação garantida",
    "duration": "ex: 30 dias",
    "copy": "frase completa da garantia que transfere risco para você, não para o cliente"
  },
  "anchorPrice": "R$ XXX (valor percebido total antes do desconto)",
  "finalPrice": "R$ XXX (preço de venda)",
  "urgency": "frase de urgência genuína e específica (não genérica como 'oferta limitada')",
  "scarcityType": "vagas|tempo|bônus expirando|preço aumentando|etc",
  "valueStack": ["item 1: Nome — R$ XXX", "item 2: Nome — R$ XXX"],
  "totalPerceivedValue": "R$ XXX (soma de todos os itens do stack)",
  "orderBump": {
    "title": "Título do order bump (solução complementar à compra principal)",
    "description": "por que comprar agora junto — 1-2 frases urgentes",
    "price": "R$ XX",
    "conversionTip": "por que este order bump vai converter (gatilho psicológico)"
  },
  "upsell": {
    "title": "Título do upsell (expansão natural após a compra principal)",
    "description": "pitch na tela pós-compra — 2-3 frases",
    "price": "R$ XXX",
    "pitch": "o argumento central: 'você já comprou X, por R$ Y a mais você consegue [resultado amplificado]'"
  },
  "downsell": {
    "title": "Título do downsell (versão menor para quem recusou o upsell)",
    "description": "pitch de última chance — 2-3 frases",
    "price": "R$ XX",
    "pitch": "argumento: 'sem problema, mas antes de ir — posso te oferecer só [X] por apenas R$ Y'"
  },
  "psychologicalPricing": "estratégia de ancoragem e precificação psicológica usada (ex: 'Âncora em R$997, preço de R$197 justificado por bônus temporários')",
  "valueEquation": "análise da Value Equation: como cada elemento maximiza Resultado Sonhado e Probabilidade, e minimiza Tempo e Esforço"
}`;

  const raw = await generateAIJson<OfferStack>(prompt, {
    systemPrompt: SYSTEM_OFFER_ARCHITECT,
    model: "google/gemini-2.5-flash",
    maxTokens: 6144,
  });
  return safeZodParse(OfferStackSchema, raw);
}

export async function generateVSLScript(input: StrategicInput): Promise<VSLScript> {
  const prompt = `${inputBlock(input)}

Crie o roteiro completo de VSL seguindo a estrutura de alta conversão:
Hook (0-15s) → Open Loop → Identificação com Avatar → Amplificação de Dor → Big Idea → Mecanismo Único → Prova Social → Oferta → Stack de Valor → Garantia → Urgência → CTA → Fechamento do Loop

O script deve soar NATURAL quando gravado, como uma conversa com o avatar — não como texto escrito.

Retorne JSON com EXATAMENTE estes campos:
{
  "hook": "0-15s: frase de abertura que para o scroll instantaneamente (número, contradição ou promessa ousada)",
  "patternInterrupt": "elemento visual ou verbal que quebra o padrão de consumo",
  "openLoop": "promessa de revelar algo no final que mantém o espectador assistindo",
  "lead": "15-60s: identificação profunda com o avatar — 'se você é como a maioria das pessoas que [situação específica]...'",
  "painAmplification": "seção de amplificação de dor: 2-3 parágrafos que fazem o avatar pensar 'é exatamente isso que sinto'",
  "bigIdeaReveal": "revelação da big idea: 'o que eu descobri vai contra tudo que te ensinaram sobre [nicho]...'",
  "story": "história do criador ou caso de sucesso que prova a big idea (com detalhes específicos e resultados mensuráveis)",
  "uniqueMechanism": "explicação do mecanismo proprietário com nome + como funciona + por que é diferente",
  "proof": "seção de prova: depoimentos específicos, números reais, transformações mensuráveis",
  "offer": "apresentação da oferta principal: 'aqui está o que você vai receber hoje...'",
  "bonuses": "revelação dos bônus um a um com valor percebido e por que cada um importa",
  "valueStack": "empilhamento de valor: 'normalmente isso valeria R$XXX... mas hoje...'",
  "guarantee": "garantia apresentada como transferência de risco total para você",
  "urgency": "urgência/escassez específica e genuína com razão real",
  "cta": "CTA claro e direto: 'clique no botão abaixo agora e...'",
  "closeLoop": "fechamento do open loop prometido no início",
  "fullScript": "roteiro completo em markdown com [HOOK 0-15s], [IDENTIFICAÇÃO 15-60s], [DOR], [BIG IDEA], [MECANISMO], [PROVA], [OFERTA], [BÔNUS], [STACK], [GARANTIA], [URGÊNCIA], [CTA] — pronto para gravar",
  "durationEstimate": "estimativa de duração (ex: '12-18 minutos')"
}`;

  const raw = await generateAIJson<VSLScript>(prompt, {
    systemPrompt: SYSTEM_VSL_DIRECTOR,
    model: "google/gemini-2.5-flash",
    maxTokens: 10000,
  });
  return safeZodParse(VSLScriptSchema, raw);
}

export async function generateFunnelMap(input: StrategicInput): Promise<FunnelMap> {
  const prompt = `${inputBlock(input)}

Mapeie o funil de vendas completo. Cada etapa deve ter objetivo claro, copy específica e meta de conversão.

Retorne JSON com EXATAMENTE estes campos:
{
  "type": "tipo do funil (ex: 'VSL + Checkout + Order Bump + Upsell')",
  "stages": [
    {
      "name": "nome da etapa (ex: 'Landing Page de Captura')",
      "objective": "objetivo específico desta etapa",
      "copy": "copy principal desta etapa (headline + sub + CTA)",
      "cta": "CTA específico",
      "conversionTarget": "meta de conversão (ex: 'opt-in 35-45%')",
      "tools": ["ferramentas sugeridas (ex: Hotmart, Kiwify, RD Station)"]
    }
  ],
  "trafficSources": ["fonte de tráfego 1 com estratégia específica", "fonte 2"],
  "emailSequence": [
    {"day": 0, "subject": "assunto com hook forte", "objective": "objetivo do e-mail", "hook": "primeira frase do corpo"}
  ],
  "retargetingStrategy": "estratégia de retargeting detalhada: quem, quando, com quê (segmentado por nível de engajamento)",
  "abTestPriorities": ["o que testar primeiro e por quê", "segundo teste prioritário"],
  "estimatedConversionRates": "taxas de conversão estimadas por etapa (ex: 'LP: 40%, VSL 75% visualização completa, Checkout: 3-5%')",
  "biggestLeakPoint": "onde o funil perde mais dinheiro atualmente e como tampar o vazamento",
  "cro": "as 3 mudanças de CRO de maior impacto neste funil específico"
}`;

  const raw = await generateAIJson<FunnelMap>(prompt, {
    systemPrompt: SYSTEM_FUNNEL_STRATEGIST,
    model: "google/gemini-2.5-flash",
    maxTokens: 6144,
  });
  return safeZodParse(FunnelMapSchema, raw);
}

export async function generateCreativeAngles(input: StrategicInput): Promise<CreativeAngles> {
  const prompt = `${inputBlock(input)}

Crie 5-7 ângulos criativos COMPLETAMENTE DISTINTOS para campanha de tráfego pago. Cada ângulo deve atingir um segmento diferente do avatar com uma emoção diferente e formato diferente.

Retorne JSON com EXATAMENTE estes campos:
{
  "angles": [
    {
      "name": "nome do ângulo (ex: 'Ângulo Antes/Depois', 'Ângulo Medo de Perder')",
      "concept": "conceito central do ângulo em 1 frase",
      "hook": "hook específico de 0-3s que para o scroll neste ângulo",
      "headline": "headline de até 80 caracteres",
      "copy": "copy de 3-5 frases prontas para usar",
      "emotion": "emoção dominante a evocar",
      "format": "formato ideal: reels 9:16|carrossel|imagem feed|stories|ugc",
      "targetSegment": "segmento específico do avatar que este ângulo alcança melhor",
      "mentalTrigger": "gatilho mental principal deste ângulo",
      "visualDescription": "como deve ser visualmente: cores, composição, elementos, mood",
      "estimatedCTR": "CTR esperado vs benchmark do nicho (ex: 'Alto: 2-4%')"
    }
  ],
  "winningAngle": "nome do ângulo com maior probabilidade de vencer e justificativa específica",
  "testPriority": ["ângulo 1 (testar primeiro)", "ângulo 2 (testar segundo)"],
  "hookFormula": "a fórmula de hook que funciona melhor para este nicho específico"
}`;

  const raw = await generateAIJson<CreativeAngles>(prompt, {
    systemPrompt: SYSTEM_CREATIVE_DIRECTOR,
    model: "google/gemini-2.5-flash",
    maxTokens: 6144,
    temperature: 0.85,
  });
  return safeZodParse(CreativeAnglesSchema, raw);
}

export async function generateScaleStrategy(input: StrategicInput): Promise<ScaleStrategy> {
  const prompt = `${inputBlock(input)}

Crie o plano de escala completo para os próximos 30 dias. Seja OPERACIONAL — cada ação deve ter O QUÊ, COMO e POR QUÊ.

Retorne JSON com EXATAMENTE estes campos:
{
  "currentDiagnosis": "diagnóstico do estado atual: maior gargalo + maior oportunidade (3-4 frases específicas)",
  "biggestBottleneck": "o UM fator que mais limita crescimento agora",
  "priorityAction": "a ação de maior ROI para as próximas 48h",
  "d3": {
    "objective": "meta específica do D1-D3",
    "budget": "orçamento total + distribuição por plataforma",
    "actions": ["ação concreta 1: ex 'Criar CBO com R$150/dia, 3 conjuntos, exclusão compradores 180d'"],
    "kpis": ["KPI 1 com meta específica: ex 'CTR > 1.8%'"],
    "pauseConditions": ["pausar se: ex 'CPA > R$60 após 2x o ticket em gasto'"],
    "scaleConditions": ["escalar se: ex 'ROAS > 2.5 por 2 dias consecutivos'"]
  },
  "d7": { (mesma estrutura para D4-D7) },
  "d14": { (mesma estrutura para D8-D14) },
  "d30": { (mesma estrutura para D15-D30) },
  "testMatrix": [
    {
      "element": "o que testar (ex: 'Hook do criativo principal')",
      "hypothesis": "hipótese específica e testável",
      "method": "como testar (ex: 'A/B no conjunto, 50/50, R$50/dia por variação')",
      "duration": "duração do teste",
      "budget": "orçamento do teste",
      "successMetric": "métrica de sucesso e threshold (ex: 'CTR > 2.2% ou CPA < R$40')"
    }
  ],
  "budgetAllocation": "distribuição do orçamento total por plataforma + objetivo (ex: '70% Meta conversões, 20% Google PMax, 10% retargeting')",
  "platformPriority": ["plataforma 1 com justificativa", "plataforma 2"],
  "warningSignals": ["sinal de alerta 1: ex 'Frequência > 2.8 em público frio = fadiga criativa'"],
  "scaleSignals": ["sinal de escala 1: ex 'ROAS estável > 3x por 3 dias = dobrar orçamento 20% a cada 48h'"]
}`;

  const raw = await generateAIJson<ScaleStrategy>(prompt, {
    systemPrompt: SYSTEM_SCALE_ANALYST,
    model: "google/gemini-2.5-flash",
    maxTokens: 8192,
  });
  return safeZodParse(ScaleStrategySchema, raw);
}

export async function generateVSLText(input: StrategicInput): Promise<string> {
  const prompt = `${inputBlock(input)}

Escreva o roteiro completo de VSL em markdown, em primeira pessoa, tom conversacional.
Estrutura obrigatória com marcadores de tempo:
[HOOK 0-15s] → [IDENTIFICAÇÃO 15-60s] → [DOR 60-180s] → [BIG IDEA] → [MECANISMO ÚNICO] → [PROVA/HISTÓRIA] → [OFERTA] → [BÔNUS] → [STACK DE VALOR] → [GARANTIA] → [URGÊNCIA] → [CTA] → [FECHA LOOP]

Seja específico ao produto e ao avatar. Escreva como quem vai gravar, não como quem vai ler.`;

  return generateAIResponse(prompt, {
    systemPrompt: SYSTEM_VSL_DIRECTOR,
    model: "google/gemini-2.5-flash",
    maxTokens: 10000,
  });
}
