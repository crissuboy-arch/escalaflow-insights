import { z } from "zod";

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
): Promise<OutlineChapter[]> {
  const data = (await aiChat({
    model: "google/gemini-3-flash-preview",
    messages: [
      {
        role: "system",
        content:
          "Você cria estruturas (sumários) de ebooks vendáveis. Sempre responda via ferramenta `outline`.",
      },
      {
        role: "user",
        content: `Briefing: ${JSON.stringify(briefing)}\n\nCrie um sumário com EXATAMENTE ${chapterCount} capítulos (sem intro/conclusão separados). Cada capítulo: título curto e 3-5 bullets do que será coberto.`,
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
): Promise<string> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const data = (await aiChat({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content:
            "Você escreve capítulos de ebook em Markdown. Tom profissional, parágrafos claros, exemplos práticos, listas quando ajudar. NÃO repita o título do capítulo no corpo. 600-1000 palavras.",
        },
        {
          role: "user",
          content: `Briefing: ${JSON.stringify(briefing)}\n\nCapítulo ${index + 1} de ${total}: "${chapter.title}"\nTópicos a cobrir:\n- ${chapter.bullets.join("\n- ")}\n\nEscreva o conteúdo completo do capítulo em Markdown.`,
        },
      ],
    })) as any;
    const text = data?.choices?.[0]?.message?.content ?? "";
    if (typeof text === "string" && text.trim().length > 80) return text;
  }
  throw new Error("Capítulo vazio após 2 tentativas");
}

export async function aiGenerateCover(
  briefing: Briefing,
  layout: string,
  customPrompt?: string,
): Promise<string> {
  const styleByLayout: Record<string, string> = {
    classico: "estilo editorial clássico, tipografia serif elegante, paleta sóbria com dourado",
    moderno: "estilo moderno funcional, blocos de cor vibrantes, sans-serif geométrico",
    minimalista: "estilo minimalista suíço, muito espaço em branco, helvetica, grid rígido",
  };
  const prompt =
    customPrompt?.trim() ||
    `Capa de ebook profissional. Título "${briefing.title}". Subtítulo "${briefing.subtitle}". Nicho: ${briefing.niche}. ${styleByLayout[layout] ?? ""}. Sem rostos humanos, alta qualidade, formato vertical 1024x1536.`;
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