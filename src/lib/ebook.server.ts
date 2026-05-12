import { z } from "zod";
import type { ProductIdentity, SizeSpec } from "./ebook/niches";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export const BriefingSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  niche: z.string(),
  promise: z.string(),
  avatar: z.string(),
  pains: z.array(z.string()),
  desires: z.array(z.string()),
  uniqueMechanism: z.string(),
});
export type Briefing = z.infer<typeof BriefingSchema>;

export const OutlineChapterSchema = z.object({
  title: z.string(),
  bullets: z.array(z.string()),
});
export const OutlineSchema = z.array(OutlineChapterSchema);
export type OutlineChapter = z.infer<typeof OutlineChapterSchema>;

export interface AdInput {
  headline?: string;
  copy?: string;
  cta?: string;
  niche?: string;
  country?: string;
  platform?: string;
  advertiser?: string;
  score?: number;
}

function getKey() {
  const k = process.env.LOVABLE_API_KEY;
  if (!k) throw new Error("LOVABLE_API_KEY ausente — habilite Lovable Cloud.");
  return k;
}

async function aiChat(body: Record<string, unknown>): Promise<unknown> {
  const key = getKey();
  const model = (body as { model?: string }).model;
  const delays = [0, 1000, 2500, 5000];
  let lastErr: unknown;
  for (let attempt = 0; attempt < delays.length; attempt++) {
    if (delays[attempt]) await sleep(delays[attempt]);
    try {
      const res = await fetch(GATEWAY_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (res.status === 429) {
        if (attempt < delays.length - 1) {
          console.warn(`[ebook.ai] 429 attempt=${attempt} model=${model}`);
          continue;
        }
        throw new Error("Limite de IA atingido. Tente novamente em alguns segundos.");
      }
      if (res.status === 402)
        throw new Error("Créditos da IA esgotados. Adicione créditos no workspace.");
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        if (res.status >= 500 && attempt < delays.length - 1) {
          lastErr = new Error(`AI gateway ${res.status}`);
          continue;
        }
        throw new Error(`AI gateway ${res.status}: ${txt.slice(0, 200)}`);
      }
      return await res.json();
    } catch (e) {
      lastErr = e;
      // Network failure: retry on transient
      if (attempt < delays.length - 1 && e instanceof TypeError) continue;
      throw e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Falha de IA");
}

function safeParseToolArgs(raw: unknown): unknown {
  if (typeof raw !== "string") return raw ?? {};
  try {
    return JSON.parse(raw);
  } catch {
    // Try to extract first {...} block
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        /* ignore */
      }
    }
    return {};
  }
}

export async function aiExtractBriefing(ad: AdInput): Promise<Briefing> {
  const data = (await aiChat({
    model: "google/gemini-3-flash-preview",
    messages: [
      {
        role: "system",
        content:
          "Você é um copywriter sênior que destila anúncios de tráfego pago em briefings de ebook. Sempre responda chamando a ferramenta `briefing`. Use o mesmo idioma do anúncio (PT-BR como fallback).",
      },
      {
        role: "user",
        content: `Anúncio:\nAnunciante: ${ad.advertiser ?? "—"}\nHeadline: ${ad.headline ?? "—"}\nCopy: ${ad.copy ?? "—"}\nCTA: ${ad.cta ?? "—"}\nNicho: ${ad.niche ?? "—"} | País: ${ad.country ?? "—"} | Plataforma: ${ad.platform ?? "—"} | Score: ${ad.score ?? "—"}`,
      },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "briefing",
          description: "Briefing estruturado para ebook",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string" },
              subtitle: { type: "string" },
              niche: { type: "string" },
              promise: { type: "string" },
              avatar: { type: "string" },
              pains: { type: "array", items: { type: "string" } },
              desires: { type: "array", items: { type: "string" } },
              uniqueMechanism: { type: "string" },
            },
            required: [
              "title",
              "subtitle",
              "niche",
              "promise",
              "avatar",
              "pains",
              "desires",
              "uniqueMechanism",
            ],
            additionalProperties: false,
          },
        },
      },
    ],
    tool_choice: { type: "function", function: { name: "briefing" } },
  })) as any;
  const args =
    data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ??
    data?.choices?.[0]?.message?.content ??
    "{}";
  return BriefingSchema.parse(safeParseToolArgs(args));
}

export async function aiGenerateOutline(
  briefing: Briefing,
  chapterCount: number,
  opts?: { identity?: ProductIdentity; tone?: string },
): Promise<OutlineChapter[]> {
  const identity = opts?.identity;
  const toneHint = opts?.tone ? `Tom: ${opts.tone}.` : "";
  const identityHint = identity?.author
    ? `Voz do autor "${identity.author}"${identity.brand ? ` (${identity.brand})` : ""}. ${toneHint}`
    : toneHint;
  const data = (await aiChat({
    model: "google/gemini-3-flash-preview",
    messages: [
      {
        role: "system",
        content:
          "Você cria estruturas (sumários) de ebooks vendáveis com narrativa progressiva (gancho → desenvolvimento → virada → prova → fechamento). Sempre responda via ferramenta `outline`.",
      },
      {
        role: "user",
        content: `Briefing: ${JSON.stringify(briefing)}\n\n${identityHint}\nCrie um sumário com EXATAMENTE ${chapterCount} capítulos (sem intro/conclusão separados). Cada capítulo: título curto, magnético (sem números) e 3-5 bullets do que será coberto.`,
      },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "outline",
          description: "Sumário do ebook",
          parameters: {
            type: "object",
            properties: {
              chapters: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    bullets: { type: "array", items: { type: "string" } },
                  },
                  required: ["title", "bullets"],
                  additionalProperties: false,
                },
              },
            },
            required: ["chapters"],
            additionalProperties: false,
          },
        },
      },
    ],
    tool_choice: { type: "function", function: { name: "outline" } },
  })) as any;
  const args =
    data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ??
    data?.choices?.[0]?.message?.content ??
    "{}";
  const parsed = safeParseToolArgs(args) as { chapters?: unknown };
  return OutlineSchema.parse(parsed?.chapters ?? []);
}

export async function aiGenerateChapter(
  briefing: Briefing,
  chapter: OutlineChapter,
  index: number,
  total: number,
  opts?: { identity?: ProductIdentity; size?: SizeSpec; tone?: string },
): Promise<string> {
  const size = opts?.size;
  const wordsTarget = size?.wordsPerChapter ?? 800;
  const extras = size?.extras;
  const identity = opts?.identity;
  const toneLine = opts?.tone ? `Tom desejado: ${opts.tone}.` : "";
  const identityLine = identity?.author
    ? `Assine a voz como "${identity.author}"${identity.brand ? ` da editora "${identity.brand}"` : ""}. Mantenha consistência ao longo do livro.`
    : "";
  const extrasLine = extras
    ? [
        extras.storytelling ? "Abra com um mini-storytelling de 1 parágrafo (cena viva, sensorial)." : "",
        extras.examples ? "Inclua pelo menos 1 bloco `## Exemplo` com caso prático." : "",
        extras.exercises ? "Inclua 1 bloco `## Exercício` com passo a passo aplicável hoje." : "",
        extras.faq ? "Inclua 1 bloco `## FAQ` com 2 perguntas frequentes e respostas curtas." : "",
        extras.bonus ? "Encerre com 1 bloco `## Bônus` (insight extra ou hack)." : "",
      ]
        .filter(Boolean)
        .join("\n- ")
    : "";
  const wordsLine = `Escreva entre ${Math.max(400, wordsTarget - 200)} e ${wordsTarget + 200} palavras.`;
  for (let attempt = 0; attempt < 2; attempt++) {
    const data = (await aiChat({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content:
            "Você é um autor profissional de ebooks vendáveis. Escreva em Markdown com voz humana, frases curtas alternadas com parágrafos médios, storytelling quando pedido. Evite bullets puros — narre. NÃO repita o título do capítulo no corpo. Sempre entregue conteúdo denso, original e útil.",
        },
        {
          role: "user",
          content: `Briefing: ${JSON.stringify(briefing)}\n${identityLine}\n${toneLine}\n\nCapítulo ${index + 1} de ${total}: "${chapter.title}"\nTópicos a cobrir:\n- ${chapter.bullets.join("\n- ")}\n\n${wordsLine}\n${extrasLine ? `Blocos obrigatórios:\n- ${extrasLine}` : ""}\n\nEntregue o capítulo completo em Markdown, com gancho de abertura, desenvolvimento, prova/exemplo, e fechamento que conecta com o próximo capítulo.`,
        },
      ],
    })) as any;
    const text = data?.choices?.[0]?.message?.content ?? "";
    if (typeof text === "string" && text.trim().length > 80) return text;
  }
  throw new Error("Capítulo vazio após 2 tentativas");
}

export interface BookExtras {
  introduction: string;
  conclusion: string;
  aboutAuthor: string;
  bonus: string;
}

export async function aiGenerateBookExtras(
  briefing: Briefing,
  identity?: ProductIdentity,
): Promise<BookExtras> {
  const data = (await aiChat({
    model: "google/gemini-3-flash-preview",
    messages: [
      {
        role: "system",
        content:
          "Você escreve seções complementares de ebooks profissionais. Sempre responda via ferramenta `extras`.",
      },
      {
        role: "user",
        content: `Briefing: ${JSON.stringify(briefing)}\nIdentidade: ${JSON.stringify(identity ?? {})}\n\nGere: introdução (1 página, com gancho), conclusão (1 página, chamando para ação), seção sobre o autor (1 parágrafo), e página de bônus (1 lista de 3 bônus). Markdown.`,
      },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "extras",
          description: "Seções extras do ebook",
          parameters: {
            type: "object",
            properties: {
              introduction: { type: "string" },
              conclusion: { type: "string" },
              aboutAuthor: { type: "string" },
              bonus: { type: "string" },
            },
            required: ["introduction", "conclusion", "aboutAuthor", "bonus"],
            additionalProperties: false,
          },
        },
      },
    ],
    tool_choice: { type: "function", function: { name: "extras" } },
  })) as any;
  const args =
    data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ??
    data?.choices?.[0]?.message?.content ??
    "{}";
  const parsed = safeParseToolArgs(args) as Partial<BookExtras>;
  return {
    introduction: String(parsed.introduction ?? ""),
    conclusion: String(parsed.conclusion ?? ""),
    aboutAuthor: String(parsed.aboutAuthor ?? ""),
    bonus: String(parsed.bonus ?? ""),
  };
}

export async function aiGenerateCover(
  briefing: Briefing,
  layout: string,
  customPrompt?: string,
  style?: string,
  palette?: string,
): Promise<string> {
  const styleByLayout: Record<string, string> = {
    classico: "estilo editorial clássico, tipografia serif elegante, paleta sóbria com dourado",
    moderno: "estilo moderno funcional, blocos de cor vibrantes, sans-serif geométrico",
    minimalista: "estilo minimalista suíço, muito espaço em branco, helvetica, grid rígido",
  };
  const styleHint = style ? ` Estilo: ${style}.` : "";
  const paletteHint = palette ? ` Paleta de cores: ${palette}.` : "";
  const prompt =
    customPrompt?.trim() ||
    `Capa de ebook profissional. Título "${briefing.title}". Subtítulo "${briefing.subtitle}". Nicho: ${briefing.niche}. ${styleByLayout[layout] ?? ""}.${styleHint}${paletteHint} Sem rostos humanos, alta qualidade, formato vertical 1024x1536.`;
  // TODO: futuro fallback DALL·E (requer OPENAI_API_KEY) e Stability.
  const data = (await aiChat({
    model: "google/gemini-3.1-flash-image-preview",
    messages: [{ role: "user", content: prompt }],
    modalities: ["image", "text"],
  })) as any;
  const imgUrl: string | undefined =
    data?.choices?.[0]?.message?.images?.[0]?.image_url?.url ??
    data?.choices?.[0]?.message?.images?.[0]?.url;
  if (!imgUrl) throw new Error("Modelo não retornou imagem.");
  return imgUrl; // data:image/png;base64,...
}

export async function aiGenerateChapterImage(
  briefing: Briefing,
  chapter: OutlineChapter,
  layout: string,
): Promise<string> {
  const styleByLayout: Record<string, string> = {
    classico: "ilustração editorial elegante, paleta sóbria",
    moderno: "ilustração moderna vibrante, formas geométricas",
    minimalista: "ilustração minimalista limpa, muito espaço em branco",
  };
  const prompt = `Ilustração de capítulo de ebook profissional sobre "${chapter.title}". Contexto: ${briefing.niche}. ${chapter.bullets.slice(0, 3).join(", ")}. ${styleByLayout[layout] ?? ""}. Sem texto na imagem. Sem rostos humanos identificáveis. Formato horizontal 16:9.`;
  const models = [
    "google/gemini-3.1-flash-image-preview",
    "google/gemini-3-pro-image-preview",
  ];
  let lastErr: unknown;
  for (const model of models) {
    try {
      const data = (await aiChat({
        model,
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      })) as any;
      const url: string | undefined =
        data?.choices?.[0]?.message?.images?.[0]?.image_url?.url ??
        data?.choices?.[0]?.message?.images?.[0]?.url;
      if (url) return url;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Falha ao gerar imagem do capítulo");
}