import { z } from "zod";
import { callGateway, safeJSON as safeParse } from "@/lib/aiService";
import { uploadMedia, publishPost, type WpCredentials } from "@/lib/wordpress.server";

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

export const ArtigoAfiliadoInputSchema = z.object({
  nicho: z.string().min(1),
  idioma: z.string().default("en"),
  produtoAfiliado: z.object({
    nome: z.string().min(1),
    // Opcional na V2.0: projetos de serviço/nicho podem não ter link/URL.
    linkAfiliado: z.string().url().optional(),
    descricao: z.string().optional(),
  }),
  tipoArtigo: z.enum(["review-produto", "guia-como-fazer", "lista-comparativa", "estudo-caso"]),
  palavraChaveAlvo: z.string().optional(),
  tomDeVoz: z.string().default("direto, prático, confiável"),
  tamanhoAlvo: z.number().default(1800),
  // Metadados do projeto SEO V2.0 carregados junto da task (sobrevivem ao parse).
  tipoProjeto: z
    .enum(["afiliado", "produto-proprio", "servico", "ecommerce", "infoproduto"])
    .optional(),
  paisAlvo: z.string().optional(),
  tituloSugerido: z.string().optional(),
  // Decisão de publicação por projeto: true=publish, false=draft. Se ausente, usa env.
  publicarAutomaticamente: z.boolean().optional(),
});
export type ArtigoAfiliadoInput = z.infer<typeof ArtigoAfiliadoInputSchema>;

export const ArtigoAfiliadoOutputSchema = z.object({
  titulo: z.string().default(""),
  slug: z.string().default(""),
  metaDescricao: z.string().max(155).default(""),
  palavraChavePrincipal: z.string().default(""),
  palavrasChaveSecundarias: z.array(z.string()).default([]),
  corpoHtml: z.string().default(""),
  pontosDeCtaAfiliado: z.array(z.string()).default([]),
  promptImagemDestaque: z.string().default(""),
  sugestoesLinkInterno: z.array(z.string()).default([]),
  categoriaSugerida: z.string().default(""),
  tags: z.array(z.string()).default([]),
});
export type ArtigoAfiliadoOutput = z.infer<typeof ArtigoAfiliadoOutputSchema>;

// ---------- Projeto SEO V2.0: tipos compartilhados ----------

export const TIPOS_PROJETO = [
  "afiliado",
  "produto-proprio",
  "servico",
  "ecommerce",
  "infoproduto",
] as const;
export type TipoProjeto = (typeof TIPOS_PROJETO)[number];

const TIPO_ARTIGO_ENUM = [
  "review-produto",
  "guia-como-fazer",
  "lista-comparativa",
  "estudo-caso",
] as const;

export const ProjetoSeoInputSchema = z.object({
  tipoProjeto: z.enum(TIPOS_PROJETO).default("afiliado"),
  // URL, nome de produto OU nicho — um campo só.
  entrada: z.string().min(2),
  idioma: z.enum(["pt", "es", "en"]).default("pt"),
  paisAlvo: z.enum(["BR", "PT", "ES", "US", "GLOBAL"]).default("BR"),
  quantidadeArtigos: z.union([z.literal(10), z.literal(30), z.literal(50), z.literal(100)]).default(10),
  publicacaoAutomatica: z.boolean().default(true),
  // Credenciais WordPress por projeto (opcional). Vazias = usa o fallback do .env.
  wpUrl: z.string().optional(),
  wpUser: z.string().optional(),
  wpAppPassword: z.string().optional(),
});
export type ProjetoSeoInput = z.infer<typeof ProjetoSeoInputSchema>;

export const ProjetoInteligenciaSchema = z.object({
  nomeProduto: z.string().default(""),
  categoria: z.string().default(""),
  avatar: z.string().default(""),
  publicoAlvo: z.string().default(""),
  beneficios: z.array(z.string()).default([]),
  dores: z.array(z.string()).default([]),
  objecoes: z.array(z.string()).default([]),
  palavrasChave: z.array(z.string()).default([]),
  intencaoBusca: z.string().default(""),
  estruturaSite: z
    .array(
      z.object({
        pagina: z.string().default(""),
        slug: z.string().default(""),
        descricao: z.string().default(""),
        conteudoHtml: z.string().default(""),
      }),
    )
    .default([]),
  calendarioEditorial: z
    .array(
      z.object({
        titulo: z.string().default(""),
        tipoArtigo: z.enum(TIPO_ARTIGO_ENUM).default("guia-como-fazer"),
        formato: z.string().default(""),
        palavraChaveAlvo: z.string().default(""),
      }),
    )
    .default([]),
});
export type ProjetoInteligencia = z.infer<typeof ProjetoInteligenciaSchema>;

const PAIS_LABEL: Record<ProjetoSeoInput["paisAlvo"], string> = {
  BR: "Brasil (pt-BR)",
  PT: "Portugal (pt-PT)",
  ES: "Espanha (es-ES)",
  US: "Estados Unidos (en-US)",
  GLOBAL: "Global",
};

const TIPO_PROJETO_LABEL: Record<TipoProjeto, string> = {
  afiliado: "produto de afiliado",
  "produto-proprio": "produto próprio",
  servico: "serviço",
  ecommerce: "e-commerce / loja",
  infoproduto: "infoproduto / curso",
};

/**
 * Núcleo de inteligência da V2.0: a partir de uma URL/produto/nicho (e, quando
 * houver URL, do conteúdo já extraído da página), a IA detecta o produto, avatar,
 * dores/benefícios/objeções, palavras-chave e gera a ESTRUTURA do site + o
 * CALENDÁRIO EDITORIAL completo com `quantidadeArtigos` itens.
 */
export async function aiAnalisarProjetoSeo(
  input: ProjetoSeoInput,
  conteudoPagina?: string,
): Promise<ProjetoInteligencia> {
  const qtd = input.quantidadeArtigos;
  const data = await aiChat(
    {
      temperature: 0.6,
      // Gera inteligência + 7 páginas institucionais (HTML) + calendário de até 100 itens.
      max_tokens: 12000,
      messages: [
        {
          role: "system",
          content: [
            "Você é um estrategista de SEO e arquiteto de conteúdo sênior. A partir de uma entrada (URL, produto ou nicho), você projeta um site de conteúdo completo. Responda SEMPRE chamando a ferramenta `montar_projeto_seo`.",
            "REGRAS OBRIGATÓRIAS:",
            "1. NÃO invente dados factuais sobre um produto específico (preço, métricas, depoimentos). Inferir avatar, dores e benefícios a partir do nicho/categoria é permitido e esperado.",
            "2. Escreva TODO o conteúdo no idioma e considerando o mercado/país-alvo informados (títulos, palavras-chave, descrições).",
            "3. `estruturaSite`: SEMPRE inclua Home, Sobre, Contato, Blog, FAQ, Política de Privacidade e Termos de Uso. Para cada página, gere: `slug` (minúsculas, hifens, sem acento), `descricao` curta do propósito e `conteudoHtml` PRONTO para publicar — texto real e completo da página usando APENAS h2, h3, p, ul, li, strong (NUNCA h1, html, head, body, script, style). Política de Privacidade e Termos de Uso devem ter cláusulas genéricas porém completas. Para 'Blog' o conteúdo pode ser uma breve introdução.",
            `4. \`calendarioEditorial\`: gere EXATAMENTE ${qtd} itens, com títulos distintos e otimizados para SEO (long-tail real, intenção de busca clara). Distribua os formatos entre artigo, review, comparativo, guia e FAQ.`,
            "5. Mapeie cada item para `tipoArtigo` (um de: review-produto, guia-como-fazer, lista-comparativa, estudo-caso) e preencha `formato` com o rótulo amigável (Artigo, Review, Comparativo, Guia, FAQ).",
            "6. Cada item deve ter uma `palavraChaveAlvo` específica e diferente das demais.",
          ].join("\n"),
        },
        {
          role: "user",
          content: [
            `Tipo de projeto: ${TIPO_PROJETO_LABEL[input.tipoProjeto]}`,
            `Entrada do usuário: ${input.entrada}`,
            `Idioma de saída: ${input.idioma}`,
            `País / mercado-alvo: ${PAIS_LABEL[input.paisAlvo]}`,
            `Quantidade de artigos no calendário: ${qtd}`,
            conteudoPagina
              ? `\nCONTEÚDO EXTRAÍDO DA PÁGINA (use como fonte principal):\n"""\n${conteudoPagina.slice(0, 8000)}\n"""`
              : "\n(Não há URL — trabalhe a partir do produto/nicho informado e do conhecimento do mercado.)",
            "",
            "Monte o projeto SEO completo: inteligência do produto/nicho, estrutura do site e calendário editorial.",
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "montar_projeto_seo",
            description:
              "Inteligência do produto/nicho + estrutura do site + calendário editorial completo.",
            parameters: {
              type: "object",
              properties: {
                nomeProduto: { type: "string" },
                categoria: { type: "string" },
                avatar: { type: "string" },
                publicoAlvo: { type: "string" },
                beneficios: { type: "array", items: { type: "string" } },
                dores: { type: "array", items: { type: "string" } },
                objecoes: { type: "array", items: { type: "string" } },
                palavrasChave: { type: "array", items: { type: "string" } },
                intencaoBusca: { type: "string" },
                estruturaSite: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      pagina: { type: "string" },
                      slug: { type: "string" },
                      descricao: { type: "string" },
                      conteudoHtml: {
                        type: "string",
                        description:
                          "HTML pronto da página usando apenas h2, h3, p, ul, li, strong.",
                      },
                    },
                    required: ["pagina", "slug", "descricao", "conteudoHtml"],
                    additionalProperties: false,
                  },
                },
                calendarioEditorial: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      titulo: { type: "string" },
                      tipoArtigo: { type: "string", enum: [...TIPO_ARTIGO_ENUM] },
                      formato: { type: "string" },
                      palavraChaveAlvo: { type: "string" },
                    },
                    required: ["titulo", "tipoArtigo", "formato", "palavraChaveAlvo"],
                    additionalProperties: false,
                  },
                },
              },
              required: [
                "nomeProduto",
                "categoria",
                "avatar",
                "publicoAlvo",
                "beneficios",
                "dores",
                "objecoes",
                "palavrasChave",
                "intencaoBusca",
                "estruturaSite",
                "calendarioEditorial",
              ],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "montar_projeto_seo" } },
    },
    { preferredProvider: "anthropic" },
  );
  return ProjetoInteligenciaSchema.parse(getToolArgs(data));
}

// ---------- AI: geração de artigo ----------

const TIPO_ARTIGO_HINT: Record<ArtigoAfiliadoInput["tipoArtigo"], string> = {
  "review-produto":
    "Review aprofundado do produto: o que é, para quem é, prós/contras, experiência de uso, veredito.",
  "guia-como-fazer":
    "Guia passo a passo (how-to) que resolve um problema do nicho e posiciona o produto como ferramenta.",
  "lista-comparativa":
    "Lista/comparativo (ex.: melhores opções), com o produto afiliado em destaque e critérios claros.",
  "estudo-caso":
    "Estudo de caso com narrativa de antes/depois e resultados, usando o produto como solução.",
};

export async function aiGerarArtigo(input: ArtigoAfiliadoInput): Promise<ArtigoAfiliadoOutput> {
  const data = await aiChat(
    {
      temperature: 0.7,
      max_tokens: 6000,
      messages: [
        {
          role: "system",
          content: [
            "Você é um redator de SEO sênior especializado em conteúdo que rankeia no Google e converte. Responda SEMPRE chamando a ferramenta `gerar_artigo_afiliado`.",
            "REGRAS OBRIGATÓRIAS:",
            "1. NÃO invente nenhum dado sobre o produto além do que foi passado em `produtoAfiliado` (nome, link, descrição). Se faltar informação, escreva de forma genérica e honesta — nunca invente preço, recursos, números ou depoimentos.",
            input.produtoAfiliado.linkAfiliado
              ? "2. Insira o link fornecido NATURALMENTE nos `pontosDeCtaAfiliado` e dentro do corpoHtml em tags <a>. NUNCA use mais de 1 link a cada 300 palavras."
              : "2. NÃO há link a inserir — deixe `pontosDeCtaAfiliado` com CTAs textuais (sem <a> de afiliado) e não invente URLs.",
            "3. Siga exatamente o `tipoArtigo` solicitado.",
            "4. `corpoHtml` deve usar APENAS tags básicas (h2, h3, p, ul, li, strong, a) prontas para o editor do WordPress. NÃO use <html>, <head>, <body>, <h1>, <script>, <style> nem classes/inline-styles.",
            "5. Mantenha o idioma pedido em TODO o conteúdo, inclusive titulo, metaDescricao, tags e categoriaSugerida.",
            "6. `metaDescricao` deve ter no máximo 155 caracteres. `slug` em minúsculas com hifens, sem acentos.",
          ].join("\n"),
        },
        {
          role: "user",
          content: [
            `Nicho: ${input.nicho}`,
            `Idioma de saída: ${input.idioma}`,
            input.paisAlvo ? `País-alvo / mercado: ${input.paisAlvo}` : "",
            input.tituloSugerido ? `Título sugerido (use ou refine): ${input.tituloSugerido}` : "",
            `Tipo de artigo: ${input.tipoArtigo} — ${TIPO_ARTIGO_HINT[input.tipoArtigo]}`,
            `Tom de voz: ${input.tomDeVoz}`,
            `Tamanho alvo: ~${input.tamanhoAlvo} palavras`,
            input.palavraChaveAlvo ? `Palavra-chave alvo: ${input.palavraChaveAlvo}` : "",
            `Produto/tema: ${input.produtoAfiliado.nome}`,
            input.produtoAfiliado.linkAfiliado
              ? `Link a divulgar: ${input.produtoAfiliado.linkAfiliado}`
              : "",
            input.produtoAfiliado.descricao
              ? `Descrição do produto: ${input.produtoAfiliado.descricao}`
              : "",
            "",
            "Gere o artigo completo otimizado para SEO e conversão.",
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "gerar_artigo_afiliado",
            description: "Artigo de SEO afiliado completo, pronto para publicar no WordPress.",
            parameters: {
              type: "object",
              properties: {
                titulo: { type: "string" },
                slug: { type: "string" },
                metaDescricao: { type: "string", maxLength: 155 },
                palavraChavePrincipal: { type: "string" },
                palavrasChaveSecundarias: { type: "array", items: { type: "string" } },
                corpoHtml: {
                  type: "string",
                  description:
                    "HTML usando apenas h2, h3, p, ul, li, strong, a — sem h1, html, head, body, script, style.",
                },
                pontosDeCtaAfiliado: { type: "array", items: { type: "string" } },
                promptImagemDestaque: { type: "string" },
                sugestoesLinkInterno: { type: "array", items: { type: "string" } },
                categoriaSugerida: { type: "string" },
                tags: { type: "array", items: { type: "string" } },
              },
              required: [
                "titulo",
                "slug",
                "metaDescricao",
                "palavraChavePrincipal",
                "palavrasChaveSecundarias",
                "corpoHtml",
                "pontosDeCtaAfiliado",
                "promptImagemDestaque",
                "sugestoesLinkInterno",
                "categoriaSugerida",
                "tags",
              ],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "gerar_artigo_afiliado" } },
    },
    { preferredProvider: "anthropic" },
  );

  const raw = (getToolArgs(data) ?? {}) as Record<string, unknown>;
  // Garante o limite de 155 chars da metaDescricao antes do parse (o schema também valida).
  return ArtigoAfiliadoOutputSchema.parse({
    ...raw,
    metaDescricao: String(raw.metaDescricao ?? "").slice(0, 155),
  });
}

// ---------- Imagem de destaque (DALL·E 3 — mesmo padrão de storybook.functions.ts) ----------

export async function gerarImagemDestaque(
  promptImagem: string,
): Promise<{ url: string; base64?: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY não configurada. Adicione a chave no .env.");
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt: promptImagem,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => res.statusText);
    throw new Error(`OpenAI error ${res.status}: ${body}`);
  }
  const json = (await res.json()) as { data?: { url?: string }[] };
  const url = json.data?.[0]?.url;
  if (!url) throw new Error("Imagem não gerada pela API.");
  return { url };
}

// ---------- Núcleo: gerar + publicar a partir de uma task ----------
// Função compartilhada usada tanto pelo generateAndPublishArtigoFn (com a sessão
// autenticada do usuário) quanto pelo cron (com supabaseAdmin) — o cron não tem
// token Supabase de usuário, então reaproveita este núcleo com o client admin.

export interface ExecuteArtigoResult {
  taskId: string;
  status: "draft" | "publish";
  artigo: ArtigoAfiliadoOutput;
  wpPostId: number;
  wpPostUrl: string;
  imagemUrl: string | null;
}

// Aceita tanto o client autenticado (context.supabase) quanto o supabaseAdmin.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = any;

export async function executeArtigoTask(
  supabase: SupabaseLike,
  taskId: string,
): Promise<ExecuteArtigoResult> {
  // 1. Carrega a task
  const { data: task, error: taskErr } = await supabase
    .from("project_tasks")
    .select("*")
    .eq("id", taskId)
    .single();
  if (taskErr || !task) throw new Error("Artigo (task) não encontrado.");

  // O briefing completo do artigo fica serializado em description (project_tasks
  // não tem coluna jsonb — sem migration nova, é o único lugar para o linkAfiliado etc.).
  let input: ArtigoAfiliadoInput;
  try {
    input = ArtigoAfiliadoInputSchema.parse(JSON.parse(task.description ?? "{}"));
  } catch {
    throw new Error("Briefing do artigo inválido ou ausente.");
  }

  // 1b. Credenciais WordPress do projeto (multi-site). Se o projeto não tiver,
  // wpCreds fica undefined e o publish cai no fallback do .env.
  const { data: proj } = await supabase
    .from("projects")
    .select("wp_url, wp_user, wp_app_password")
    .eq("id", task.project_id)
    .single();
  const wpCreds: WpCredentials | undefined =
    proj?.wp_url && proj?.wp_user && proj?.wp_app_password
      ? { url: proj.wp_url, user: proj.wp_user, password: proj.wp_app_password }
      : undefined;

  // 2. Marca como "writing"
  await supabase
    .from("project_tasks")
    .update({ status: "writing" } as never)
    .eq("id", taskId);

  try {
    // 3. Gera o artigo com IA
    const artigo = await aiGerarArtigo(input);

    // 4. Gera a imagem de destaque — NÃO bloqueia a publicação em caso de erro
    let imagemUrl: string | null = null;
    let featuredMediaId: number | undefined;
    try {
      const img = await gerarImagemDestaque(artigo.promptImagemDestaque);
      const uploaded = await uploadMedia(
        img.base64 ?? img.url,
        `${artigo.slug || "destaque"}.png`,
        wpCreds,
      );
      featuredMediaId = uploaded.mediaId;
      imagemUrl = uploaded.url;
    } catch (imgErr) {
      console.error("[afiliados-seo] imagem de destaque falhou, seguindo sem ela:", imgErr);
    }

    // 5. Publica no WordPress. A decisão por projeto (input.publicarAutomaticamente)
    // tem prioridade; se ausente, cai no flag global WORDPRESS_AUTO_PUBLISH.
    const status: "draft" | "publish" =
      (input.publicarAutomaticamente ?? process.env.WORDPRESS_AUTO_PUBLISH === "true")
        ? "publish"
        : "draft";
    const post = await publishPost(
      {
        titulo: artigo.titulo,
        corpoHtml: artigo.corpoHtml,
        slug: artigo.slug,
        metaDescricao: artigo.metaDescricao,
        categoriaSugerida: artigo.categoriaSugerida,
        tags: artigo.tags,
        featuredMediaId,
        status,
      },
      wpCreds,
    );

    // 6. Registra o resultado em project_outputs
    await supabase.from("project_outputs").insert({
      project_id: task.project_id,
      user_id: task.user_id,
      agent: "motor-afiliados-seo",
      kind: "artigo",
      payload: {
        ...artigo,
        taskId,
        imagemUrl,
        wpPostId: post.postId,
        wpPostUrl: post.url,
        wpStatus: status,
      } as never,
      status: "done",
    } as never);

    // 7. Marca a task como publicada
    await supabase
      .from("project_tasks")
      .update({ status: "published" } as never)
      .eq("id", taskId);

    return {
      taskId,
      status,
      artigo,
      wpPostId: post.postId,
      wpPostUrl: post.url,
      imagemUrl,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // project_tasks não tem coluna error — registramos o erro em project_outputs.error.
    await supabase
      .from("project_tasks")
      .update({ status: "failed" } as never)
      .eq("id", taskId);
    await supabase
      .from("project_outputs")
      .insert({
        project_id: task.project_id,
        user_id: task.user_id,
        agent: "motor-afiliados-seo",
        // kind distinto das linhas de sucesso (kind='artigo') — nunca confundir erro com artigo publicado.
        kind: "artigo_erro",
        payload: { taskId } as never,
        status: "error",
        error: msg,
      } as never)
      .then(
        () => {},
        () => {},
      );
    throw new Error(msg);
  }
}
