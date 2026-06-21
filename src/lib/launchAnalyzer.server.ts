import { z } from "zod";
import { callGateway, safeJSON as safeParse } from "@/lib/aiService";
import { scrapeOfferPage, type ScrapeResult } from "@/lib/scraper/playwright-scraper";

const aiChat = callGateway;

function getToolArgs(data: unknown): unknown {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = data as any;
  return safeParse(
    d?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ??
      d?.choices?.[0]?.message?.content ??
      "{}",
  );
}

// ---------- Schemas ----------

export const DiagnosticoOfertaSchema = z.object({
  produto: z.string().default(""),
  tipoOferta: z.enum(["infoproduto", "servico", "produto_fisico", "saas"]).nullable().default(null),
  promessaPrincipal: z.string().default(""),
  publicoAlvo: z.string().default(""),
  dores: z.array(z.string()).default([]),
  desejos: z.array(z.string()).default([]),
  beneficios: z.array(z.string()).default([]),
  objecoesNaoRespondidas: z.array(z.string()).default([]),
  precoDetectado: z.number().nullable().default(null),
  moeda: z.string().nullable().default(null),
  ctaPagina: z.string().nullable().default(null),
  provaSocialPresente: z.boolean().default(false),
  garantiaPresente: z.boolean().default(false),
  scores: z
    .object({
      clareza: z.number().default(0),
      atratividade: z.number().default(0),
      potencialEscala: z.number().default(0),
      competitividade: z.number().default(0),
      facilidadeVenda: z.number().default(0),
      pontuacaoGeral: z.number().default(0),
    })
    .default({}),
  financeiro: z
    .object({
      margemEstimada: z.number().nullable().default(null),
      cpaMaximoAceitavel: z.number().nullable().default(null),
      roasMinimoRecomendado: z.number().nullable().default(null),
    })
    .default({}),
  diagnostico: z
    .object({
      podeAnunciar: z.boolean().default(false),
      motivo: z.string().default(""),
      top5Problemas: z.array(z.string()).default([]),
    })
    .default({}),
  dadosNaoEncontrados: z.array(z.string()).default([]),
});
export type DiagnosticoOferta = z.infer<typeof DiagnosticoOfertaSchema>;

export const CampanhaGeradaSchema = z.object({
  campanha: z
    .object({
      nomeCampanha: z.string().default("Campanha"),
      objetivoMetaAds: z.string().default(""),
      nomeConjuntoAnuncios: z.string().default(""),
      publicoRecomendado: z.string().default(""),
      idadeSugerida: z.string().default(""),
      localizacaoSugerida: z.string().default(""),
      interessesMetaAds: z.array(z.string()).default([]),
    })
    .default({}),
  criativos: z
    .object({
      headlines: z.array(z.string()).default([]),
      textosPrincipais: z.array(z.string()).default([]),
      descricoes: z.array(z.string()).default([]),
      angulosCriativos: z.array(z.string()).default([]),
      sugestoesImagem: z.array(z.string()).default([]),
      sugestoesVideo: z.array(z.string()).default([]),
      ctaRecomendado: z.string().default(""),
    })
    .default({}),
  orcamento: z
    .object({
      orcamentoInicialRecomendadoDia: z.number().default(0),
      moeda: z.string().default(""),
    })
    .default({}),
});
export type CampanhaGerada = z.infer<typeof CampanhaGeradaSchema>;

// ---------- AI calls ----------

export async function aiDiagnosticarOferta(conteudoPagina: string): Promise<DiagnosticoOferta> {
  const data = await aiChat(
    {
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: [
            "Você é um analista sênior de ofertas e de tráfego pago (Meta Ads). Analise SOMENTE o conteúdo da página fornecido e responda SEMPRE chamando a ferramenta `diagnostico_oferta`. Use o mesmo idioma do conteúdo.",
            "REGRAS OBRIGATÓRIAS:",
            "1. NUNCA invente dados que não estão explícitos na página. Se um dado não existir, use null no campo correspondente e adicione o nome do campo em `dadosNaoEncontrados`.",
            "2. Rubrica FIXA de score (cada dimensão de 0 a 100): clareza pesa 20%, atratividade 25%, potencialEscala 15%, competitividade 15%, facilidadeVenda 25%. `pontuacaoGeral` = média ponderada dessas 5 dimensões usando exatamente esses pesos (0 a 100).",
            "3. Margem padrão por tipoOferta: infoproduto 0.85, servico 0.6, produto_fisico 0.35, saas 0.75. Aplique a margem SOMENTE se `precoDetectado` existir. Se `precoDetectado` for null, então `financeiro.margemEstimada`, `financeiro.cpaMaximoAceitavel` e `financeiro.roasMinimoRecomendado` ficam TODOS null.",
            "4. Quando houver preço: margemEstimada = margem do tipo; cpaMaximoAceitavel = precoDetectado × margemEstimada; roasMinimoRecomendado = 1 / margemEstimada.",
            "5. podeAnunciar = false se pontuacaoGeral < 50 OU precoDetectado é null OU ctaPagina é null. Caso contrário, true.",
            "6. `diagnostico.top5Problemas` = os 5 maiores problemas da oferta. `diagnostico.motivo` = explicação objetiva da decisão de podeAnunciar.",
          ].join("\n"),
        },
        {
          role: "user",
          content: `Analise a oferta desta página e preencha o diagnóstico completo.\n\nCONTEÚDO DA PÁGINA:\n"""\n${conteudoPagina.slice(0, 8000)}\n"""`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "diagnostico_oferta",
            description:
              "Diagnóstico estruturado de uma oferta para decisão de anúncio em Meta Ads.",
            parameters: {
              type: "object",
              properties: {
                produto: { type: "string" },
                tipoOferta: {
                  type: ["string", "null"],
                  enum: ["infoproduto", "servico", "produto_fisico", "saas", null],
                },
                promessaPrincipal: { type: "string" },
                publicoAlvo: { type: "string" },
                dores: { type: "array", items: { type: "string" } },
                desejos: { type: "array", items: { type: "string" } },
                beneficios: { type: "array", items: { type: "string" } },
                objecoesNaoRespondidas: { type: "array", items: { type: "string" } },
                precoDetectado: { type: ["number", "null"] },
                moeda: { type: ["string", "null"] },
                ctaPagina: { type: ["string", "null"] },
                provaSocialPresente: { type: "boolean" },
                garantiaPresente: { type: "boolean" },
                scores: {
                  type: "object",
                  properties: {
                    clareza: { type: "number" },
                    atratividade: { type: "number" },
                    potencialEscala: { type: "number" },
                    competitividade: { type: "number" },
                    facilidadeVenda: { type: "number" },
                    pontuacaoGeral: { type: "number" },
                  },
                  required: [
                    "clareza",
                    "atratividade",
                    "potencialEscala",
                    "competitividade",
                    "facilidadeVenda",
                    "pontuacaoGeral",
                  ],
                  additionalProperties: false,
                },
                financeiro: {
                  type: "object",
                  properties: {
                    margemEstimada: { type: ["number", "null"] },
                    cpaMaximoAceitavel: { type: ["number", "null"] },
                    roasMinimoRecomendado: { type: ["number", "null"] },
                  },
                  required: ["margemEstimada", "cpaMaximoAceitavel", "roasMinimoRecomendado"],
                  additionalProperties: false,
                },
                diagnostico: {
                  type: "object",
                  properties: {
                    podeAnunciar: { type: "boolean" },
                    motivo: { type: "string" },
                    top5Problemas: { type: "array", items: { type: "string" } },
                  },
                  required: ["podeAnunciar", "motivo", "top5Problemas"],
                  additionalProperties: false,
                },
                dadosNaoEncontrados: { type: "array", items: { type: "string" } },
              },
              required: [
                "produto",
                "tipoOferta",
                "promessaPrincipal",
                "publicoAlvo",
                "dores",
                "desejos",
                "beneficios",
                "objecoesNaoRespondidas",
                "precoDetectado",
                "moeda",
                "ctaPagina",
                "provaSocialPresente",
                "garantiaPresente",
                "scores",
                "financeiro",
                "diagnostico",
                "dadosNaoEncontrados",
              ],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "diagnostico_oferta" } },
    },
    { preferredProvider: "anthropic" },
  );
  return DiagnosticoOfertaSchema.parse(getToolArgs(data));
}

export async function aiGerarCampanha(diagnostico: DiagnosticoOferta): Promise<CampanhaGerada> {
  const contexto = {
    produto: diagnostico.produto,
    tipoOferta: diagnostico.tipoOferta,
    promessaPrincipal: diagnostico.promessaPrincipal,
    publicoAlvo: diagnostico.publicoAlvo,
    dores: diagnostico.dores,
    desejos: diagnostico.desejos,
    beneficios: diagnostico.beneficios,
    objecoesNaoRespondidas: diagnostico.objecoesNaoRespondidas,
    precoDetectado: diagnostico.precoDetectado,
    moeda: diagnostico.moeda,
    ctaPagina: diagnostico.ctaPagina,
  };
  const data = await aiChat(
    {
      temperature: 0.8,
      messages: [
        {
          role: "system",
          content: [
            "Você é um media buyer sênior especialista em Meta Ads. Responda SEMPRE chamando a ferramenta `gerar_campanha`.",
            "REGRAS OBRIGATÓRIAS:",
            "1. Use SOMENTE os dados do diagnóstico recebido. NÃO recalcule score nem o financeiro.",
            "2. Gere EXATAMENTE: 10 headlines (máx 40 caracteres cada), 5 textosPrincipais (máx 125 caracteres cada), 5 descricoes (máx 30 caracteres cada), 5 angulosCriativos, 3 sugestoesImagem e 3 sugestoesVideo.",
            "3. Use o MESMO idioma do conteúdo original do diagnóstico.",
            "4. NÃO invente claims ou promessas que o diagnóstico não sustenta.",
          ].join("\n"),
        },
        {
          role: "user",
          content: `Gere uma campanha completa de Meta Ads para esta oferta, com base no diagnóstico abaixo.\n\nDIAGNÓSTICO:\n${JSON.stringify(contexto, null, 2)}`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "gerar_campanha",
            description:
              "Campanha completa de Meta Ads (estrutura + criativos + orçamento) para uma oferta.",
            parameters: {
              type: "object",
              properties: {
                campanha: {
                  type: "object",
                  properties: {
                    nomeCampanha: { type: "string" },
                    objetivoMetaAds: { type: "string" },
                    nomeConjuntoAnuncios: { type: "string" },
                    publicoRecomendado: { type: "string" },
                    idadeSugerida: { type: "string" },
                    localizacaoSugerida: { type: "string" },
                    interessesMetaAds: { type: "array", items: { type: "string" } },
                  },
                  required: [
                    "nomeCampanha",
                    "objetivoMetaAds",
                    "nomeConjuntoAnuncios",
                    "publicoRecomendado",
                    "idadeSugerida",
                    "localizacaoSugerida",
                    "interessesMetaAds",
                  ],
                  additionalProperties: false,
                },
                criativos: {
                  type: "object",
                  properties: {
                    headlines: { type: "array", items: { type: "string" } },
                    textosPrincipais: { type: "array", items: { type: "string" } },
                    descricoes: { type: "array", items: { type: "string" } },
                    angulosCriativos: { type: "array", items: { type: "string" } },
                    sugestoesImagem: { type: "array", items: { type: "string" } },
                    sugestoesVideo: { type: "array", items: { type: "string" } },
                    ctaRecomendado: { type: "string" },
                  },
                  required: [
                    "headlines",
                    "textosPrincipais",
                    "descricoes",
                    "angulosCriativos",
                    "sugestoesImagem",
                    "sugestoesVideo",
                    "ctaRecomendado",
                  ],
                  additionalProperties: false,
                },
                orcamento: {
                  type: "object",
                  properties: {
                    orcamentoInicialRecomendadoDia: { type: "number" },
                    moeda: { type: "string" },
                  },
                  required: ["orcamentoInicialRecomendadoDia", "moeda"],
                  additionalProperties: false,
                },
              },
              required: ["campanha", "criativos", "orcamento"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "gerar_campanha" } },
    },
    { preferredProvider: "anthropic" },
  );
  return CampanhaGeradaSchema.parse(getToolArgs(data));
}

// ---------- Scraping ----------

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));
}

/** Monta a string de conteúdo a partir do resultado renderizado pelo Playwright. */
function buildConteudoFromScrape(r: ScrapeResult): string {
  return [
    r.page.title ? `TÍTULO: ${r.page.title}` : "",
    r.page.metaDescription ? `DESCRIÇÃO: ${r.page.metaDescription}` : "",
    r.headings.h1.length ? `H1: ${r.headings.h1.join(" | ")}` : "",
    r.offer.prices.length ? `PREÇOS: ${r.offer.prices.join(" | ")}` : "",
    r.ctas.buttons.length ? `CTAs/BOTÕES: ${r.ctas.buttons.slice(0, 15).join(" | ")}` : "",
    `CONTEÚDO:\n${r.body.mainText}`,
  ]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 8000);
}

/**
 * Extrai o conteúdo da página para análise. Primeiro tenta RENDERIZAR via
 * navegador headless (Playwright/Chromium já configurado no projeto) — essencial
 * para páginas SPA (React/Vue) e atrás de proteção anti-bot, que retornam só a
 * casca da aplicação via fetch. Se o Playwright falhar ou estourar 15s, cai para
 * o fetch simples. Lança erro claro se ambos falharem — nunca segue com conteúdo
 * vazio.
 */
export async function extrairConteudoPagina(url: string): Promise<string> {
  // 1. Renderização completa via navegador headless, com teto rígido de 15s.
  try {
    const rendered = await Promise.race([
      // goto com folga (12s) para sobrar tempo de extração dentro da janela de 15s
      scrapeOfferPage(url, 12_000),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("playwright-timeout")), 15_000),
      ),
    ]);
    if (rendered.ok) {
      const out = buildConteudoFromScrape(rendered);
      if (out.replace(/\s/g, "").length >= 50) return out;
    }
  } catch {
    // Playwright indisponível, bloqueado ou timeout — usa o fetch simples abaixo.
  }

  // 2. Fallback: fetch simples do HTML estático.
  return extrairViaFetch(url);
}

/** Fallback: extração via fetch puro do HTML (sem renderização de JS). */
async function extrairViaFetch(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: controller.signal,
    });
  } catch (e) {
    throw new Error(
      `Não foi possível acessar a página (${url}). ${
        e instanceof Error && e.name === "AbortError"
          ? "Tempo de resposta esgotado."
          : e instanceof Error
            ? e.message
            : ""
      }`.trim(),
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok)
    throw new Error(
      `A página retornou status ${res.status}. Verifique a URL ou tente outra página.`,
    );

  const html = await res.text();

  const title = stripTags(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
  const metaDesc =
    html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1] ??
    html.match(/<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["']/i)?.[1] ??
    "";
  const ogDesc =
    html.match(/<meta[^>]+property=["']og:description["'][^>]*content=["']([^"']*)["']/i)?.[1] ??
    "";

  const ctas = [...html.matchAll(/<(?:button|a)\b[^>]*>([\s\S]*?)<\/(?:button|a)>/gi)]
    .map((m) => stripTags(m[1]))
    .filter((t) => t.length > 1 && t.length < 60);

  const body = decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();

  const out = [
    title ? `TÍTULO: ${title}` : "",
    metaDesc ? `DESCRIÇÃO: ${metaDesc}` : "",
    ogDesc && ogDesc !== metaDesc ? `RESUMO: ${ogDesc}` : "",
    ctas.length ? `CTAs/BOTÕES: ${[...new Set(ctas)].slice(0, 15).join(" | ")}` : "",
    `CONTEÚDO:\n${body}`,
  ]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 8000);

  if (out.replace(/\s/g, "").length < 50)
    throw new Error(
      "A página não retornou conteúdo legível (possível bloqueio, JavaScript pesado ou página vazia). Tente outra URL.",
    );

  return out;
}

/** Detecção simples de idioma pelo conteúdo (pt | es | en), padrão "pt". */
export function detectarIdioma(texto: string): string {
  const t = ` ${texto.toLowerCase()} `;
  const score = (words: string[]) => words.reduce((n, w) => n + (t.split(` ${w} `).length - 1), 0);
  const pt = score(["de", "que", "não", "com", "para", "você", "uma", "como", "está"]);
  const es = score(["el", "los", "una", "para", "con", "qué", "cómo", "está", "tu"]);
  const en = score(["the", "and", "you", "your", "with", "for", "this", "that", "have"]);
  if (en > pt && en > es) return "en";
  if (es > pt && es > en) return "es";
  return "pt";
}
