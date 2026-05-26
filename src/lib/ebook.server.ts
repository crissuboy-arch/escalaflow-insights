import { z } from "zod";
import type { ProductIdentity, SizeSpec } from "./ebook/niches";
import { AGENT_STORY_CHIEF } from "./agents";
import { callGateway } from "@/lib/aiService";

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

const aiChat = callGateway;

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

export async function aiExtractBriefingFromText(
  text: string,
  opts?: { fileName?: string; language?: string },
): Promise<Briefing & { suggestedChapterCount: number }> {
  const lang = opts?.language || "Português";
  const data = (await aiChat({
    model: "google/gemini-3-flash-preview",
    messages: [
      {
        role: "system",
        content:
          "Você é um editor sênior que transforma documentos de referência em briefings de ebook PREMIUM. Identifique tema, promessa, avatar, dores, desejos e mecanismo único. Sempre responda chamando a ferramenta `briefing`. Use o idioma do conteúdo enviado (fallback: " +
          lang +
          ").",
      },
      {
        role: "user",
        content: `Arquivo: ${opts?.fileName ?? "documento.pdf"}\n\nConteúdo extraído (pode estar truncado):\n"""\n${text}\n"""\n\nGere um briefing premium e sugira número ideal de capítulos (3 a 12).`,
      },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "briefing",
          description: "Briefing premium para ebook a partir de PDF",
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
              suggestedChapterCount: { type: "number" },
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
              "suggestedChapterCount",
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
  const parsed = safeParseToolArgs(args) as Record<string, unknown>;
  const briefing = BriefingSchema.parse(parsed);
  const sc = Number(parsed.suggestedChapterCount);
  const suggestedChapterCount = Number.isFinite(sc) ? Math.max(3, Math.min(12, Math.round(sc))) : 6;
  return { ...briefing, suggestedChapterCount };
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
          `${AGENT_STORY_CHIEF}\n\n---\n\nVocê cria estruturas (sumários) de ebooks vendáveis com narrativa progressiva (gancho → desenvolvimento → virada → prova → fechamento). Sempre responda via ferramenta \`outline\`.`,
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
            `${AGENT_STORY_CHIEF}\n\n---\n\nVocê é um autor profissional de ebooks vendáveis. Escreva em Markdown com voz humana, frases curtas alternadas com parágrafos médios, storytelling quando pedido. Evite bullets puros — narre. NÃO repita o título do capítulo no corpo. Sempre entregue conteúdo denso, original e útil.`,
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

export function generateFallbackCoverSvg(title: string, subtitle: string, layout: string): string {
  const palettes: Record<string, { bg: string; accent: string; text: string }> = {
    classico: { bg: "#1a1a2e", accent: "#c9a84c", text: "#f5f0e8" },
    moderno: { bg: "#0a6cff", accent: "#ffffff", text: "#ffffff" },
    minimalista: { bg: "#ffffff", accent: "#111111", text: "#111111" },
  };
  const p = palettes[layout] ?? palettes.classico;
  const words = title.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > 22) { lines.push(cur.trim()); cur = w; }
    else cur = (cur + " " + w).trim();
  }
  if (cur) lines.push(cur);
  const titleLines = lines.map((l, i) => `<text x="512" y="${420 + i * 72}" font-family="Georgia,serif" font-size="58" font-weight="bold" fill="${p.text}" text-anchor="middle">${l}</text>`).join("\n");
  const sub = subtitle.length > 60 ? subtitle.slice(0, 57) + "…" : subtitle;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1536"><defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${p.bg}"/><stop offset="100%" stop-color="${p.accent}" stop-opacity="0.25"/></linearGradient></defs><rect width="1024" height="1536" fill="url(#bg)"/><rect x="80" y="80" width="864" height="1376" rx="16" fill="none" stroke="${p.accent}" stroke-width="3" opacity="0.4"/>${titleLines}<text x="512" y="${420 + lines.length * 72 + 60}" font-family="Arial,sans-serif" font-size="32" fill="${p.text}" text-anchor="middle" opacity="0.75">${sub}</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
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
  try {
    const data = (await aiChat({ model: "google/gemini-3.1-flash-image-preview", messages: [{ role: "user", content: prompt }], modalities: ["image", "text"] })) as any;
    const imgUrl: string | undefined = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url ?? data?.choices?.[0]?.message?.images?.[0]?.url;
    if (imgUrl) return imgUrl;
  } catch (e) {
    console.warn("[ebook] Gemini falhou, usando capa local:", e instanceof Error ? e.message : e);
  }
  return generateFallbackCoverSvg(briefing.title, briefing.subtitle, layout);
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