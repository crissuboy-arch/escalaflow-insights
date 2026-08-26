import { z } from "zod";
import { callGateway, safeJSON } from "@/lib/aiService";
// Reuso dos blocos SEGUROS do Launch Analyzer (sem alterar o módulo): extração de
// conteúdo (com fallback Playwright→fetch) e o diagnóstico de oferta. NÃO reusamos
// sales-page/scale aqui porque eles fixam modelos google/* que o provedor
// configurado (OpenAI) rejeita com 400 — o orquestrador usa modelos válidos.
import {
  extrairConteudoPagina,
  aiDiagnosticarOferta,
  type DiagnosticoOferta,
} from "./launchAnalyzer.server";

// Modelo barato por padrão; forte só na decisão final (ambos validados no provedor).
const MODELO_FORTE = process.env.QUICK_MONEY_STRONG_MODEL || "gpt-4o";

// ---------- Entrada ----------

export const TIPOS_PRODUTO = [
  "clickbank",
  "shopify",
  "hotmart",
  "fisico",
  "digital",
  "manual",
] as const;
export const CANAIS = ["meta", "google", "tiktok", "seo", "auto"] as const;
export const PAISES_DR = ["BR", "PT", "ES", "US", "GLOBAL"] as const;

export const DinheiroRapidoInputSchema = z.object({
  url: z.string().trim().default(""),
  produto: z.string().trim().default(""), // usado quando não há URL (tipo manual)
  tipo: z.enum(TIPOS_PRODUTO).default("manual"),
  paisAlvo: z.enum(PAISES_DR).default("BR"),
  orcamento: z.string().trim().default(""),
  canal: z.enum(CANAIS).default("auto"),
  modoEconomico: z.boolean().default(true),
});
export type DinheiroRapidoInput = z.infer<typeof DinheiroRapidoInputSchema>;

const PAIS_INFO: Record<
  (typeof PAISES_DR)[number],
  { nome: string; moeda: string; simbolo: string; idioma: string }
> = {
  BR: { nome: "Brasil", moeda: "BRL", simbolo: "R$", idioma: "pt-BR" },
  PT: { nome: "Portugal", moeda: "EUR", simbolo: "€", idioma: "pt-PT" },
  ES: { nome: "Espanha", moeda: "EUR", simbolo: "€", idioma: "es-ES" },
  US: { nome: "Estados Unidos", moeda: "USD", simbolo: "$", idioma: "en-US" },
  GLOBAL: { nome: "Global", moeda: "USD", simbolo: "$", idioma: "en" },
};

const CANAL_LABEL: Record<(typeof CANAIS)[number], string> = {
  meta: "Meta Ads (Facebook/Instagram)",
  google: "Google Ads",
  tiktok: "TikTok Ads",
  seo: "SEO",
  auto: "Automático (a IA escolhe)",
};

// ---------- Schemas de saída (lenientes, com defaults) ----------

export const DecisaoSchema = z.object({
  entrar: z.enum(["SIM", "NÃO"]).default("NÃO"),
  confianca: z.coerce.number().min(0).max(100).default(0),
  produtoRecomendado: z.string().default(""),
  pais: z.string().default(""),
  canalPrioritario: z.string().default(""),
  orcamentoInicial: z.string().default(""),
  cpaMaximo: z.string().default(""),
  roasMinimo: z.string().default(""),
  prazoValidacao: z.string().default(""),
  proximaAcao: z.string().default(""),
  motivo: z.string().default(""),
  risco: z.string().default(""),
  potencial: z.string().default(""),
  concorrencia: z.string().default(""),
});
export type Decisao = z.infer<typeof DecisaoSchema>;

export const OfertaSchema = z.object({
  bigIdea: z.string().default(""),
  posicionamento: z.string().default(""),
  mecanismoUnico: z.string().default(""),
  nomeOferta: z.string().default(""),
  headline: z.string().default(""),
  promessaPrincipal: z.string().default(""),
  propostaDeValor: z.string().default(""),
  escadaDeValor: z.array(z.string()).default([]),
  estrategiaInicial: z.string().default(""),
});

export const PaginaSchema = z.object({
  landingCopy: z.string().default(""),
  reviewCopy: z.string().default(""),
  advertorialCopy: z.string().default(""),
  html: z.string().default(""),
  observacoes: z.string().default(""),
});

export const CriativosSchema = z.object({
  hooks: z.array(z.string()).default([]),
  roteiros: z.array(z.string()).default([]),
  copiesMeta: z.array(z.string()).default([]),
  copiesGoogle: z.array(z.string()).default([]),
  promptsImagem: z.array(z.string()).default([]),
  angulos: z.array(z.string()).default([]),
});

export const SeoSchema = z.object({
  palavrasChave: z.array(z.string()).default([]),
  titulos: z.array(z.string()).default([]),
  reviews: z.array(z.string()).default([]),
  comparativos: z.array(z.string()).default([]),
  faq: z.array(z.object({ pergunta: z.string().default(""), resposta: z.string().default("") })).default([]),
  calendario7dias: z.array(z.object({ dia: z.coerce.number().default(0), titulo: z.string().default(""), formato: z.string().default("") })).default([]),
});

export const TrafegoSchema = z.object({
  canalRecomendado: z.string().default(""),
  orcamentoDiario: z.string().default(""),
  cpaMaximo: z.string().default(""),
  roasMinimo: z.string().default(""),
  planoTeste7dias: z.array(z.string()).default([]),
  quandoPausar: z.array(z.string()).default([]),
  quandoEscalar: z.array(z.string()).default([]),
  proximoPasso: z.string().default(""),
});

export const DinheiroRapidoResultSchema = z.object({
  input: DinheiroRapidoInputSchema,
  decisao: DecisaoSchema,
  diagnostico: z.any().nullable().default(null),
  oferta: OfertaSchema.nullable().default(null),
  pagina: PaginaSchema.nullable().default(null),
  criativos: CriativosSchema.nullable().default(null),
  seo: SeoSchema.nullable().default(null),
  trafego: TrafegoSchema.nullable().default(null),
  checklist: z.array(z.string()).default([]),
  errors: z.record(z.string(), z.string()).default({}),
  geradoEm: z.string().default(""),
});
export type DinheiroRapidoResult = z.infer<typeof DinheiroRapidoResultSchema>;

// ---------- Helper de IA: modelo válido + fallback de provedor ----------

function extractContent(res: unknown): string {
  const r = res as { choices?: Array<{ message?: { content?: string } }> };
  return r.choices?.[0]?.message?.content ?? "{}";
}

/**
 * Chama a IA pedindo JSON. Tenta o provedor padrão (OpenAI, gpt-4o-mini válido)
 * e, se falhar, cai para o Anthropic (claude-haiku) com instrução de JSON.
 * NUNCA usa modelos google/* (rejeitados pelo provedor com 400).
 */
async function aiJson<S extends z.ZodTypeAny>(
  schema: S,
  system: string,
  user: string,
  opts: { strong?: boolean; maxTokens?: number } = {},
): Promise<z.infer<S>> {
  const maxTokens = opts.maxTokens ?? 4000;
  try {
    const res = await callGateway({
      ...(opts.strong ? { model: MODELO_FORTE } : {}),
      max_tokens: maxTokens,
      temperature: 0.7,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    });
    return schema.parse(safeJSON(extractContent(res)));
  } catch {
    // Fallback: outro provedor (Anthropic) — sem response_format, com instrução.
    const res = await callGateway(
      {
        max_tokens: maxTokens,
        temperature: 0.7,
        messages: [
          { role: "system", content: system + "\n\nResponda APENAS com JSON válido, sem markdown." },
          { role: "user", content: user },
        ],
      },
      { preferredProvider: "anthropic" },
    );
    return schema.parse(safeJSON(extractContent(res)));
  }
}

// ---------- Builders de contexto ----------

type Base = {
  produto: string;
  nicho: string;
  publico: string;
  promessa: string;
  preco: string;
  dores: string[];
  desejos: string[];
  beneficios: string[];
  objecoes: string[];
  conteudo: string;
};

function buildBase(input: DinheiroRapidoInput, diag: DiagnosticoOferta | null, conteudo: string): Base {
  return {
    produto: diag?.produto || input.produto || input.url || "Produto",
    nicho: diag?.publicoAlvo ? diag.publicoAlvo.slice(0, 60) : input.tipo,
    publico: diag?.publicoAlvo || "",
    promessa: diag?.promessaPrincipal || "",
    preco: diag?.precoDetectado != null ? `${diag.moeda ?? ""} ${diag.precoDetectado}`.trim() : "",
    dores: diag?.dores ?? [],
    desejos: diag?.desejos ?? [],
    beneficios: diag?.beneficios ?? [],
    objecoes: diag?.objecoesNaoRespondidas ?? [],
    conteudo: conteudo.slice(0, 4000),
  };
}

function basePrompt(base: Base, input: DinheiroRapidoInput): string {
  const pais = PAIS_INFO[input.paisAlvo];
  return [
    `Produto/tema: ${base.produto}`,
    `Nicho/público: ${base.publico || base.nicho}`,
    base.promessa ? `Promessa: ${base.promessa}` : "",
    base.preco ? `Preço: ${base.preco}` : "",
    base.dores.length ? `Dores: ${base.dores.join(" · ")}` : "",
    base.desejos.length ? `Desejos: ${base.desejos.join(" · ")}` : "",
    base.beneficios.length ? `Benefícios: ${base.beneficios.join(" · ")}` : "",
    base.objecoes.length ? `Objeções: ${base.objecoes.join(" · ")}` : "",
    `Mercado-alvo: ${pais.nome} (idioma ${pais.idioma}, moeda ${pais.simbolo})`,
    base.conteudo ? `\nConteúdo extraído da página:\n"""\n${base.conteudo}\n"""` : "",
    `\nEscreva TODO o conteúdo no idioma do mercado-alvo. Não invente dados factuais (preço/depoimentos).`,
  ]
    .filter(Boolean)
    .join("\n");
}

// ---------- Seções (cada uma é 1 chamada barata e isolada) ----------

async function gerarOferta(base: Base, input: DinheiroRapidoInput) {
  return aiJson(
    OfertaSchema,
    "Você é um estrategista de marketing direto sênior. Responda só JSON.",
    `Com base no produto abaixo, crie a estratégia de oferta. Retorne JSON:
{"bigIdea":"","posicionamento":"","mecanismoUnico":"nome proprietário + explicação","nomeOferta":"","headline":"","promessaPrincipal":"","propostaDeValor":"","escadaDeValor":["front-end","order bump","upsell","downsell/back-end"],"estrategiaInicial":"como entrar no mercado nos primeiros dias"}

${basePrompt(base, input)}`,
    { maxTokens: 2500 },
  );
}

async function gerarPagina(base: Base, input: DinheiroRapidoInput) {
  return aiJson(
    PaginaSchema,
    "Você é copywriter de resposta direta + dev front-end. Responda só JSON.",
    `Gere os ativos de página para o produto abaixo. Retorne JSON:
{"landingCopy":"copy completa da landing page em markdown (hero, dor, mecanismo, benefícios, oferta, garantia, FAQ, CTA)","reviewCopy":"artigo de review honesto em markdown","advertorialCopy":"advertorial estilo notícia/storytelling em markdown","html":"UMA página HTML responsiva autocontida usando Tailwind via CDN (<!doctype html>...), dark, mobile-first, pronta pra colar","observacoes":"3 dicas de CRO"}
Mantenha o HTML compacto porém completo e válido.

${basePrompt(base, input)}`,
    { maxTokens: 6000 },
  );
}

async function gerarCriativos(base: Base, input: DinheiroRapidoInput) {
  return aiJson(
    CriativosSchema,
    "Você é diretor criativo de performance. Responda só JSON.",
    `Gere o pacote de criativos para o produto abaixo. Retorne JSON com EXATAMENTE:
{"hooks":[10 hooks de 0-3s p/ TikTok/Reels/Shorts],"roteiros":[10 roteiros curtos de vídeo],"copiesMeta":[10 copies de Meta Ads],"copiesGoogle":[10 copies de Google Ads (headline+descrição)],"promptsImagem":[10 prompts de imagem em inglês],"angulos":[5 ângulos de anúncio]}

${basePrompt(base, input)}`,
    { maxTokens: 5000 },
  );
}

async function gerarSeo(base: Base, input: DinheiroRapidoInput) {
  return aiJson(
    SeoSchema,
    "Você é estrategista de SEO. Responda só JSON.",
    `Gere o pacote de SEO para o produto abaixo. Retorne JSON com EXATAMENTE:
{"palavrasChave":[20 palavras-chave long-tail],"titulos":[10 títulos de artigos],"reviews":[5 títulos de review],"comparativos":[5 títulos de comparativo],"faq":[{"pergunta":"","resposta":""} x6],"calendario7dias":[{"dia":1,"titulo":"","formato":"artigo|review|comparativo|guia|faq"} x7]}

${basePrompt(base, input)}`,
    { maxTokens: 4000 },
  );
}

async function gerarTrafego(base: Base, input: DinheiroRapidoInput, diag: DiagnosticoOferta | null) {
  const pais = PAIS_INFO[input.paisAlvo];
  const fin = diag?.financeiro;
  return aiJson(
    TrafegoSchema,
    "Você é media buyer sênior. Responda só JSON. Use a moeda do mercado-alvo.",
    `Monte o plano de tráfego para o produto abaixo. Retorne JSON:
{"canalRecomendado":"","orcamentoDiario":"em ${pais.simbolo}","cpaMaximo":"em ${pais.simbolo}","roasMinimo":"","planoTeste7dias":[7 itens, 1 por dia],"quandoPausar":["regras exatas"],"quandoEscalar":["regras exatas"],"proximoPasso":""}

Canal desejado pelo usuário: ${CANAL_LABEL[input.canal]}
Orçamento disponível: ${input.orcamento || "—"}
${fin?.cpaMaximoAceitavel != null ? `CPA máximo sugerido pelo diagnóstico: ${pais.simbolo} ${fin.cpaMaximoAceitavel}` : ""}
${fin?.roasMinimoRecomendado != null ? `ROAS mínimo sugerido: ${fin.roasMinimoRecomendado}` : ""}

${basePrompt(base, input)}`,
    { maxTokens: 2500 },
  );
}

async function gerarDecisao(
  base: Base,
  input: DinheiroRapidoInput,
  diag: DiagnosticoOferta | null,
  trafego: z.infer<typeof TrafegoSchema> | null,
): Promise<Decisao> {
  const pais = PAIS_INFO[input.paisAlvo];
  return aiJson(
    DecisaoSchema,
    "Você é um head de aquisição cético e direto. Decide se vale anunciar um produto com base nos dados. Responda só JSON.",
    `Decida se vale a pena entrar com tráfego pago neste produto AGORA. Seja honesto: se a oferta é fraca, diga NÃO. Retorne JSON:
{"entrar":"SIM|NÃO","confianca":0-100,"produtoRecomendado":"","pais":"${pais.nome}","canalPrioritario":"Meta|Google|TikTok|SEO","orcamentoInicial":"em ${pais.simbolo}","cpaMaximo":"em ${pais.simbolo}","roasMinimo":"","prazoValidacao":"ex: 7 dias","proximaAcao":"a ÚNICA próxima ação exata","motivo":"por que SIM/NÃO em 1-2 frases","risco":"baixo|médio|alto + por quê","potencial":"baixo|médio|alto + por quê","concorrencia":"estimativa de concorrência no nicho"}

DADOS DO DIAGNÓSTICO:
- Score geral: ${diag?.scores?.pontuacaoGeral ?? "—"}/100
- Pode anunciar (heurística): ${diag?.diagnostico?.podeAnunciar ?? "—"}
- Motivo da heurística: ${diag?.diagnostico?.motivo ?? "—"}
- Preço: ${base.preco || "—"}
PLANO DE TRÁFEGO: ${trafego ? JSON.stringify(trafego).slice(0, 1500) : "—"}
Orçamento do usuário: ${input.orcamento || "—"} · Canal desejado: ${CANAL_LABEL[input.canal]}

${basePrompt(base, input)}`,
    { strong: true, maxTokens: 1500 },
  );
}

function decisaoFallback(
  input: DinheiroRapidoInput,
  diag: DiagnosticoOferta | null,
  base: Base,
): Decisao {
  const pais = PAIS_INFO[input.paisAlvo];
  const pode = diag?.diagnostico?.podeAnunciar ?? false;
  const fin = diag?.financeiro;
  return DecisaoSchema.parse({
    entrar: pode ? "SIM" : "NÃO",
    confianca: diag?.scores?.pontuacaoGeral ?? 0,
    produtoRecomendado: base.produto,
    pais: pais.nome,
    canalPrioritario: input.canal === "auto" ? "Meta" : CANAL_LABEL[input.canal],
    orcamentoInicial: input.orcamento || "",
    cpaMaximo: fin?.cpaMaximoAceitavel != null ? `${pais.simbolo} ${fin.cpaMaximoAceitavel}` : "",
    roasMinimo: fin?.roasMinimoRecomendado != null ? String(fin.roasMinimoRecomendado) : "",
    prazoValidacao: "7 dias",
    proximaAcao: pode
      ? "Subir campanha de teste com orçamento baixo e validar CPA em 7 dias."
      : "Melhorar a oferta antes de investir em tráfego.",
    motivo: diag?.diagnostico?.motivo || "Decisão derivada do diagnóstico (IA de síntese indisponível).",
    risco: pode ? "médio" : "alto",
    potencial: diag?.scores?.potencialEscala != null ? `${diag.scores.potencialEscala}/100` : "",
    concorrencia: "",
  });
}

// ---------- Orquestrador ----------

export async function runPipeline(input: DinheiroRapidoInput): Promise<DinheiroRapidoResult> {
  const errors: Record<string, string> = {};
  const err = (k: string, e: unknown) => {
    errors[k] = e instanceof Error ? e.message : String(e);
  };

  // 1. Conteúdo da URL (best-effort; fallback embutido no extrator).
  let conteudo = "";
  if (input.url) {
    try {
      conteudo = await extrairConteudoPagina(input.url);
    } catch (e) {
      err("conteudo", e);
    }
  }

  // 2. Diagnóstico (espinha). Se falhar, segue com null e os campos do formulário.
  let diagnostico: DiagnosticoOferta | null = null;
  try {
    if (conteudo) diagnostico = await aiDiagnosticarOferta(conteudo);
  } catch (e) {
    err("diagnostico", e);
  }

  const base = buildBase(input, diagnostico, conteudo);

  // 3. Seções em paralelo (cada falha é isolada — nunca derruba o resto).
  const [ofertaR, paginaR, criativosR, seoR, trafegoR] = await Promise.allSettled([
    gerarOferta(base, input),
    gerarPagina(base, input),
    gerarCriativos(base, input),
    gerarSeo(base, input),
    gerarTrafego(base, input, diagnostico),
  ]);

  const pick = <T,>(r: PromiseSettledResult<T>, key: string): T | null => {
    if (r.status === "fulfilled") return r.value;
    err(key, r.reason);
    return null;
  };

  const oferta = pick(ofertaR, "oferta");
  const pagina = pick(paginaR, "pagina");
  const criativos = pick(criativosR, "criativos");
  const seo = pick(seoR, "seo");
  const trafego = pick(trafegoR, "trafego");

  // 4. Decisão final (modelo forte). Fallback determinístico se a IA falhar.
  let decisao: Decisao;
  try {
    decisao = await gerarDecisao(base, input, diagnostico, trafego);
  } catch (e) {
    err("decisao", e);
    decisao = decisaoFallback(input, diagnostico, base);
  }

  // 5. Checklist de validação (derivado — sem custo de IA).
  const checklist = [
    `Conferir a oferta: ${base.produto}`,
    decisao.entrar === "SIM"
      ? "Subir 1 campanha de teste com orçamento baixo"
      : "Reforçar a oferta antes de investir",
    `Definir CPA máximo (${decisao.cpaMaximo || "definir"}) e ROAS mínimo (${decisao.roasMinimo || "definir"})`,
    "Publicar a landing page / review gerados",
    "Subir 3-5 criativos a partir dos hooks/roteiros",
    `Validar em ${decisao.prazoValidacao || "7 dias"} e decidir pausar/escalar`,
    decisao.proximaAcao || "Executar a próxima ação definida pela IA",
  ];

  // Se NADA de IA funcionou, deixa claro (mas ainda devolve a estrutura).
  if (!diagnostico && !oferta && !pagina && !criativos && !seo && !trafego) {
    errors.geral =
      errors.geral ||
      "Nenhuma etapa de IA retornou. Verifique as chaves de IA e a URL informada.";
  }

  return DinheiroRapidoResultSchema.parse({
    input,
    decisao,
    diagnostico,
    oferta,
    pagina,
    criativos,
    seo,
    trafego,
    checklist,
    errors,
    geradoEm: new Date().toISOString(),
  });
}
