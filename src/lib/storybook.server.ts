import { z } from "zod";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function getKey() {
  const k = process.env.LOVABLE_API_KEY;
  if (!k) throw new Error("LOVABLE_API_KEY ausente — habilite Lovable Cloud.");
  return k;
}

async function aiChat(body: Record<string, unknown>): Promise<unknown> {
  const key = getKey();
  const delays = [0, 1200, 3000, 6000];
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
        if (attempt < delays.length - 1) continue;
        throw new Error("Limite de IA atingido. Aguarde alguns segundos.");
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
      if (attempt < delays.length - 1 && e instanceof TypeError) continue;
      throw e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Falha de IA");
}

function safeParse(raw: unknown): unknown {
  if (typeof raw !== "string") return raw ?? {};
  try {
    return JSON.parse(raw);
  } catch {
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

export const StoryPlanningSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().optional().default(""),
  type: z.string().min(1),
  subniche: z.string().optional().default(""),
  audience: z.string().optional().default(""),
  language: z.string().default("Português"),
  chapters: z.number().min(5).max(150).default(20),
  ending: z.string().default("feliz"),
  intensity: z.string().default("intensa"),
  hotLevel: z.string().default("sensual"),
  tone: z.string().default("cinematografico"),
  author: z.string().optional().default(""),
});
export type StoryPlanning = z.infer<typeof StoryPlanningSchema>;

export const CharacterSchema = z.object({
  id: z.string(),
  role: z.string(),
  name: z.string(),
  age: z.number().int().min(12).max(120),
  look: z.string(),
  personality: z.string(),
  trauma: z.string(),
  desires: z.string(),
  fears: z.string(),
  style: z.string(),
  quotes: z.array(z.string()).default([]),
  refImageUrl: z.string().nullable().optional(),
  visualPrompts: z
    .object({ pixar: z.string(), realistic: z.string(), anime: z.string() })
    .optional(),
});
export type Character = z.infer<typeof CharacterSchema>;

export const StructureSchema = z.object({
  synopsis: z.string(),
  bigIdea: z.string(),
  plotTwist: z.string(),
  hooks: z.array(z.string()),
  cliffhangers: z.array(z.string()),
  journey: z.array(z.string()),
  outline: z.array(z.object({ title: z.string(), summary: z.string() })),
});
export type StoryStructure = z.infer<typeof StructureSchema>;

export const ChapterSchema = z.object({
  id: z.string(),
  index: z.number().int(),
  title: z.string(),
  body: z.string().default(""),
  words: z.number().int().default(0),
  status: z.enum(["empty", "ready", "editing"]).default("empty"),
});
export type StoryChapter = z.infer<typeof ChapterSchema>;

function buildContext(planning: StoryPlanning, characters?: Character[]) {
  return [
    `Tipo: ${planning.type}`,
    `Subnicho: ${planning.subniche || "—"}`,
    `Público: ${planning.audience || "—"}`,
    `Idioma: ${planning.language}`,
    `Tom: ${planning.tone}`,
    `Final: ${planning.ending} | Intensidade: ${planning.intensity} | Nível hot: ${planning.hotLevel}`,
    characters?.length
      ? `Personagens: ${characters
          .map((c) => `${c.name} (${c.role}, ${c.age}a) — ${c.personality}`)
          .join("; ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

// ---------- AI calls ----------

export async function aiGenerateCharacters(
  planning: StoryPlanning,
  count: number,
): Promise<Character[]> {
  const data = await aiChat({
    model: "google/gemini-3-flash-preview",
    messages: [
      {
        role: "system",
        content:
          "Você é um romancista que cria personagens vívidos, com profundidade emocional e arcos crus. Sempre responda chamando a ferramenta `characters`. Use o idioma do briefing.",
      },
      {
        role: "user",
        content: `História: "${planning.title}".\n${buildContext(planning)}\n\nGere ${count} personagens principais (protagonista(s), antagonista, suporte). Para cada um, crie nome, papel, idade, aparência detalhada (1-2 frases), personalidade (1 frase), trauma central, desejos profundos, medos, estilo de roupa e 2 frases marcantes que ele(a) diria.`,
      },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "characters",
          parameters: {
            type: "object",
            properties: {
              characters: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    role: { type: "string" },
                    name: { type: "string" },
                    age: { type: "number" },
                    look: { type: "string" },
                    personality: { type: "string" },
                    trauma: { type: "string" },
                    desires: { type: "string" },
                    fears: { type: "string" },
                    style: { type: "string" },
                    quotes: { type: "array", items: { type: "string" } },
                  },
                  required: [
                    "role",
                    "name",
                    "age",
                    "look",
                    "personality",
                    "trauma",
                    "desires",
                    "fears",
                    "style",
                    "quotes",
                  ],
                  additionalProperties: false,
                },
              },
            },
            required: ["characters"],
            additionalProperties: false,
          },
        },
      },
    ],
    tool_choice: { type: "function", function: { name: "characters" } },
  });
  const args = getToolArgs(data) as { characters?: unknown[] };
  const list = Array.isArray(args.characters) ? args.characters : [];
  return list.map((raw) => {
    const c = raw as Partial<Character>;
    const id = crypto.randomUUID();
    const name = c.name ?? "Personagem";
    const look = c.look ?? "";
    const style = c.style ?? "";
    return CharacterSchema.parse({
      id,
      role: c.role ?? "Protagonista",
      name,
      age: Number(c.age ?? 28),
      look,
      personality: c.personality ?? "",
      trauma: c.trauma ?? "",
      desires: c.desires ?? "",
      fears: c.fears ?? "",
      style,
      quotes: Array.isArray(c.quotes) ? c.quotes : [],
      refImageUrl: null,
      visualPrompts: {
        pixar: `Estilo Pixar 3D: ${name}, ${look}, ${style}, expressivo, iluminação cinematográfica`,
        realistic: `Foto-realista cinematográfica: ${name}, ${look}, ${style}, profundidade de campo, lente 85mm`,
        anime: `Estilo anime moderno: ${name}, ${look}, ${style}, cores vibrantes, traço limpo`,
      },
    });
  });
}

export async function aiGenerateStructure(
  planning: StoryPlanning,
  characters: Character[],
): Promise<StoryStructure> {
  const data = await aiChat({
    model: "google/gemini-3-flash-preview",
    messages: [
      {
        role: "system",
        content:
          "Você arquiteta romances vendáveis. Sempre responda via ferramenta `structure`. Use o idioma do briefing.",
      },
      {
        role: "user",
        content: `História "${planning.title}".\n${buildContext(planning, characters)}\n\nGere: sinopse (1 parágrafo, vendável), big idea emocional (1 frase impactante), plot twist principal, 5 ganchos viralizáveis, 5 cliffhangers chave, jornada emocional (5-8 marcos), e outline com EXATAMENTE ${planning.chapters} capítulos. Cada capítulo: título magnético + resumo de 1-2 frases. NÃO repita títulos.`,
      },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "structure",
          parameters: {
            type: "object",
            properties: {
              synopsis: { type: "string" },
              bigIdea: { type: "string" },
              plotTwist: { type: "string" },
              hooks: { type: "array", items: { type: "string" } },
              cliffhangers: { type: "array", items: { type: "string" } },
              journey: { type: "array", items: { type: "string" } },
              outline: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    summary: { type: "string" },
                  },
                  required: ["title", "summary"],
                  additionalProperties: false,
                },
              },
            },
            required: [
              "synopsis",
              "bigIdea",
              "plotTwist",
              "hooks",
              "cliffhangers",
              "journey",
              "outline",
            ],
            additionalProperties: false,
          },
        },
      },
    ],
    tool_choice: { type: "function", function: { name: "structure" } },
  });
  return StructureSchema.parse(getToolArgs(data));
}

export type ChapterAction =
  | "generate"
  | "regenerate"
  | "expand"
  | "shorten"
  | "more-emotion"
  | "more-tension"
  | "more-romance"
  | "more-humor"
  | "more-dialogue";

const ACTION_HINT: Record<ChapterAction, string> = {
  generate: "Escreva o capítulo completo do zero.",
  regenerate: "Reescreva totalmente mantendo o arco mas mudando a abordagem.",
  expand: "Expanda o texto atual em ~50%, mais cenas, mais profundidade. Mantenha enredo.",
  shorten: "Reduza o texto em ~30% mantendo apenas o essencial e o ritmo.",
  "more-emotion": "Reescreva injetando muito mais emoção, vulnerabilidade e conflito interno.",
  "more-tension": "Reescreva aumentando tensão, ameaça e suspense em cada parágrafo.",
  "more-romance": "Reescreva intensificando química, desejo e proximidade entre os protagonistas.",
  "more-humor": "Reescreva adicionando humor, ironia e diálogos espirituosos sem perder o tom.",
  "more-dialogue": "Reescreva com muito mais diálogos vivos entre os personagens.",
};

export async function aiGenerateChapter(
  planning: StoryPlanning,
  characters: Character[],
  outlineItem: { title: string; summary: string },
  index: number,
  total: number,
  action: ChapterAction,
  previousBody: string,
  previousChapterRecap?: string,
): Promise<string> {
  const wordsTarget = planning.chapters >= 100 ? 1200 : planning.chapters >= 60 ? 1000 : 800;
  const recap = previousChapterRecap
    ? `\nResumo do capítulo anterior: ${previousChapterRecap.slice(0, 600)}`
    : "";
  const current =
    action !== "generate" && previousBody
      ? `\n\nTexto atual do capítulo:\n"""\n${previousBody.slice(0, 6000)}\n"""`
      : "";
  const data = await aiChat({
    model: "google/gemini-3-flash-preview",
    messages: [
      {
        role: "system",
        content:
          "Você é um romancista bestseller. Escreva em prosa fluida, primeira ou terceira pessoa conforme o tom. Frases curtas alternadas com parágrafos médios. Diálogos vivos com marcações em travessão. Storytelling sensorial. NÃO repita o título do capítulo. NÃO invente personagens novos sem motivo. Responda SOMENTE com o texto do capítulo, sem cabeçalho, sem comentários, sem markdown além de quebras de parágrafo.",
      },
      {
        role: "user",
        content: `${buildContext(planning, characters)}${recap}\n\nCapítulo ${index + 1} de ${total}: "${outlineItem.title}"\nResumo: ${outlineItem.summary}\n\nMeta: ${wordsTarget} palavras (±200). Encerre com cliffhanger ou gancho emocional para o próximo capítulo.\n\nAção solicitada: ${ACTION_HINT[action]}${current}`,
      },
    ],
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const text = (data as any)?.choices?.[0]?.message?.content ?? "";
  if (typeof text !== "string" || text.trim().length < 80)
    throw new Error("Capítulo vazio. Tente novamente.");
  return text.trim();
}

export interface CoverPrompts {
  dalle: string;
  midjourney: string;
  leonardo: string;
  gemini: string;
}

export async function aiGenerateCoverPrompts(
  planning: StoryPlanning,
  styleHint: string,
  badges: string[],
): Promise<CoverPrompts> {
  const data = await aiChat({
    model: "google/gemini-3-flash-preview",
    messages: [
      {
        role: "system",
        content:
          "Você é diretor de arte de capas de livros virais. Sempre responda via ferramenta `prompts`. Cada prompt deve ser otimizado para o modelo respectivo (DALL·E sintético, Midjourney com parâmetros --ar 2:3 --style raw --v 6, Leonardo descritivo, Gemini direto). Inclua título e subtítulo como TEXTO na capa quando apropriado.",
      },
      {
        role: "user",
        content: `Capa de "${planning.title}"${planning.subtitle ? ` — ${planning.subtitle}` : ""}.\nGênero: ${planning.type}. Estilo visual: ${styleHint}.\nSelos opcionais: ${badges.join(", ") || "—"}.\nAutor: ${planning.author || "—"}.\n\nGere prompts de capa cinematográfica formato vertical 2:3, com tipografia bold no título, atmosfera condizente com o gênero e tom ${planning.tone}.`,
      },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "prompts",
          parameters: {
            type: "object",
            properties: {
              dalle: { type: "string" },
              midjourney: { type: "string" },
              leonardo: { type: "string" },
              gemini: { type: "string" },
            },
            required: ["dalle", "midjourney", "leonardo", "gemini"],
            additionalProperties: false,
          },
        },
      },
    ],
    tool_choice: { type: "function", function: { name: "prompts" } },
  });
  const args = getToolArgs(data) as Partial<CoverPrompts>;
  return {
    dalle: String(args.dalle ?? ""),
    midjourney: String(args.midjourney ?? ""),
    leonardo: String(args.leonardo ?? ""),
    gemini: String(args.gemini ?? ""),
  };
}

export interface ShortScript {
  pov: string;
  hook: string;
  script: string;
  caption: string;
  cta: string;
  hashtags: string[];
  scenePrompts: string[];
}

export async function aiGenerateShorts(
  planning: StoryPlanning,
  chapter: { title: string; body: string },
): Promise<ShortScript[]> {
  const data = await aiChat({
    model: "google/gemini-3-flash-preview",
    messages: [
      {
        role: "system",
        content:
          "Você é roteirista viral de TikTok/Reels para edits de romance. Sempre responda via ferramenta `shorts`. Roteiros de 30-60s, hooks fortes nos primeiros 2s.",
      },
      {
        role: "user",
        content: `Capítulo "${chapter.title}" da história "${planning.title}" (${planning.type}, tom ${planning.tone}).\nTrecho:\n"""\n${chapter.body.slice(0, 3500)}\n"""\n\nGere 3 shorts diferentes (POVs distintos) com hook viral, roteiro narrado, legenda, CTA, 8 hashtags virais e 3 prompts visuais de cena para gerar imagens/clips.`,
      },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "shorts",
          parameters: {
            type: "object",
            properties: {
              shorts: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    pov: { type: "string" },
                    hook: { type: "string" },
                    script: { type: "string" },
                    caption: { type: "string" },
                    cta: { type: "string" },
                    hashtags: { type: "array", items: { type: "string" } },
                    scenePrompts: { type: "array", items: { type: "string" } },
                  },
                  required: [
                    "pov",
                    "hook",
                    "script",
                    "caption",
                    "cta",
                    "hashtags",
                    "scenePrompts",
                  ],
                  additionalProperties: false,
                },
              },
            },
            required: ["shorts"],
            additionalProperties: false,
          },
        },
      },
    ],
    tool_choice: { type: "function", function: { name: "shorts" } },
  });
  const args = getToolArgs(data) as { shorts?: ShortScript[] };
  return Array.isArray(args.shorts) ? args.shorts : [];
}

export async function aiGenerateAudiobookScript(
  planning: StoryPlanning,
  chapter: { title: string; body: string },
  voiceHint: string,
): Promise<string> {
  const data = await aiChat({
    model: "google/gemini-3-flash-preview",
    messages: [
      {
        role: "system",
        content:
          "Você adapta capítulos de romance para narração de audiobook. Use marcações inline simples: [pausa], [ênfase], [sussurro], [forte], [emocionado]. Mantenha 100% do conteúdo. Quebre frases longas para respiração. Responda APENAS com o roteiro narrado.",
      },
      {
        role: "user",
        content: `Voz: ${voiceHint}. Tom da história: ${planning.tone}.\nCapítulo "${chapter.title}":\n"""\n${chapter.body.slice(0, 8000)}\n"""`,
      },
    ],
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const text = (data as any)?.choices?.[0]?.message?.content ?? "";
  return typeof text === "string" ? text.trim() : "";
}