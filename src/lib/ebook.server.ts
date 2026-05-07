import { z } from "zod";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

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
  console.log(
    `[ebook.ai] gateway call model=${model ?? "?"} hasKey=${Boolean(key)} keyLen=${key?.length ?? 0}`,
  );
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  console.log(`[ebook.ai] gateway response status=${res.status}`);
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("Limite de IA atingido. Tente novamente em alguns segundos.");
    if (res.status === 402) throw new Error("Créditos da IA esgotados. Adicione créditos no workspace.");
    throw new Error(`AI gateway ${res.status}: ${txt.slice(0, 200)}`);
  }
  return res.json();
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
    data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ?? "{}";
  return BriefingSchema.parse(JSON.parse(args));
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
    data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ?? "{}";
  const parsed = JSON.parse(args);
  return OutlineSchema.parse(parsed.chapters);
}

export async function aiGenerateChapter(
  briefing: Briefing,
  chapter: OutlineChapter,
  index: number,
  total: number,
): Promise<string> {
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
  if (typeof text !== "string" || !text.trim()) throw new Error("Capítulo vazio");
  return text;
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