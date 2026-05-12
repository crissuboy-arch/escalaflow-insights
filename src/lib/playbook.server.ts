import { z } from "zod";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export const PlaybookBriefingSchema = z.object({
  title: z.string(),
  niche: z.string(),
  promise: z.string(),
  avatar: z.string(),
  uniqueMechanism: z.string(),
  pains: z.array(z.string()),
  desires: z.array(z.string()),
});
export type PlaybookBriefing = z.infer<typeof PlaybookBriefingSchema>;

export const SceneOutlineSchema = z.object({
  title: z.string(),
  summary: z.string(),
  exercise: z.string(),
  practicalAction: z.string(),
});
export type SceneOutline = z.infer<typeof SceneOutlineSchema>;

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
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${getKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("Limite de IA atingido. Tente novamente em alguns segundos.");
    if (res.status === 402) throw new Error("Créditos da IA esgotados.");
    throw new Error(`AI gateway ${res.status}: ${txt.slice(0, 200)}`);
  }
  return res.json();
}

export async function aiExtractPlaybookBriefing(ad: AdInput): Promise<PlaybookBriefing> {
  const data = (await aiChat({
    model: "google/gemini-3-flash-preview",
    messages: [
      { role: "system", content: "Você destila anúncios em briefings de playbook (passo-a-passo). Responda via ferramenta `briefing` em PT-BR." },
      { role: "user", content: `Anunciante: ${ad.advertiser ?? "—"}\nHeadline: ${ad.headline ?? "—"}\nCopy: ${ad.copy ?? "—"}\nCTA: ${ad.cta ?? "—"}\nNicho: ${ad.niche ?? "—"} | Plataforma: ${ad.platform ?? "—"}` },
    ],
    tools: [{
      type: "function",
      function: {
        name: "briefing",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string" },
            niche: { type: "string" },
            promise: { type: "string" },
            avatar: { type: "string" },
            uniqueMechanism: { type: "string" },
            pains: { type: "array", items: { type: "string" } },
            desires: { type: "array", items: { type: "string" } },
          },
          required: ["title", "niche", "promise", "avatar", "uniqueMechanism", "pains", "desires"],
          additionalProperties: false,
        },
      },
    }],
    tool_choice: { type: "function", function: { name: "briefing" } },
  })) as any;
  const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ?? "{}";
  return PlaybookBriefingSchema.parse(JSON.parse(args));
}

export async function aiGenerateSceneOutline(briefing: PlaybookBriefing, sceneCount: number): Promise<SceneOutline[]> {
  const data = (await aiChat({
    model: "google/gemini-3-flash-preview",
    messages: [
      { role: "system", content: "Você cria roteiros de playbook em cenas didáticas, divertidas e acionáveis. Responda via ferramenta `outline`." },
      { role: "user", content: `Briefing: ${JSON.stringify(briefing)}\n\nCrie EXATAMENTE ${sceneCount} cenas com progressão lógica do problema à solução. Cada cena: title curto + summary (1-2 linhas) + exercise (pergunta reflexiva) + practicalAction (tarefa concreta).` },
    ],
    tools: [{
      type: "function",
      function: {
        name: "outline",
        parameters: {
          type: "object",
          properties: {
            scenes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  summary: { type: "string" },
                  exercise: { type: "string" },
                  practicalAction: { type: "string" },
                },
                required: ["title", "summary", "exercise", "practicalAction"],
                additionalProperties: false,
              },
            },
          },
          required: ["scenes"],
          additionalProperties: false,
        },
      },
    }],
    tool_choice: { type: "function", function: { name: "outline" } },
  })) as any;
  const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ?? "{}";
  return z.array(SceneOutlineSchema).parse(JSON.parse(args).scenes);
}

export const SceneContentSchema = z.object({
  text: z.string(),
  balloons: z.array(z.string()).max(4),
});
export type SceneContent = z.infer<typeof SceneContentSchema>;

export async function aiGenerateSceneContent(
  briefing: PlaybookBriefing,
  scene: SceneOutline,
  index: number,
  total: number,
): Promise<SceneContent> {
  const data = (await aiChat({
    model: "google/gemini-3-flash-preview",
    messages: [
      { role: "system", content: "Você escreve conteúdo de playbook em PT-BR, tom premium e divertido. 180-280 palavras por cena. Sempre via ferramenta `scene`." },
      { role: "user", content: `Briefing: ${JSON.stringify(briefing)}\nCena ${index + 1}/${total}: ${scene.title}\nResumo: ${scene.summary}\nExercício: ${scene.exercise}\nAção prática: ${scene.practicalAction}` },
    ],
    tools: [{
      type: "function",
      function: {
        name: "scene",
        parameters: {
          type: "object",
          properties: {
            text: { type: "string" },
            balloons: { type: "array", items: { type: "string" }, maxItems: 4 },
          },
          required: ["text", "balloons"],
          additionalProperties: false,
        },
      },
    }],
    tool_choice: { type: "function", function: { name: "scene" } },
  })) as any;
  const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ?? "{}";
  return SceneContentSchema.parse(JSON.parse(args));
}

export async function aiGenerateSceneImage(
  briefing: PlaybookBriefing,
  scene: { title: string; summary: string },
  theme: string,
): Promise<string> {
  const styleByTheme: Record<string, string> = {
    "neon-roxo": "estilo cinematográfico cyberpunk neon roxo e azul, brilho vibrante, sem rostos",
    "dourado-editorial": "estilo editorial sofisticado dourado em fundo escuro, alto contraste, sem rostos",
    "minimal-dark": "minimalista geométrico, fundo escuro, formas abstratas, paleta monocromática",
  };
  const prompt = `Banner horizontal 16:9 para playbook. Cena "${scene.title}". Tema: ${briefing.niche}. ${styleByTheme[theme] ?? styleByTheme["neon-roxo"]}. Conceito visual ilustrativo, sem texto na imagem.`;
  const data = (await aiChat({
    model: "google/gemini-3.1-flash-image-preview",
    messages: [{ role: "user", content: prompt }],
    modalities: ["image", "text"],
  })) as any;
  const url: string | undefined =
    data?.choices?.[0]?.message?.images?.[0]?.image_url?.url ??
    data?.choices?.[0]?.message?.images?.[0]?.url;
  if (!url) throw new Error("Modelo não retornou imagem.");
  return url;
}

export async function aiGenerateVideoScript(briefing: PlaybookBriefing, scenes: { title: string; text: string }[]): Promise<string> {
  const data = (await aiChat({
    model: "google/gemini-3-flash-preview",
    messages: [
      { role: "system", content: "Você converte playbooks em roteiros de vídeo (YouTube/Reels). Saída em Markdown com cabeçalhos por cena, narração e sugestões de cortes." },
      { role: "user", content: `Título: ${briefing.title}\nNicho: ${briefing.niche}\nAvatar: ${briefing.avatar}\nPromessa: ${briefing.promise}\n\nCenas:\n${scenes.map((s, i) => `### Cena ${i + 1}: ${s.title}\n${s.text}`).join("\n\n")}` },
    ],
  })) as any;
  const text = data?.choices?.[0]?.message?.content ?? "";
  if (typeof text !== "string" || !text.trim()) throw new Error("Roteiro vazio");
  return text;
}

// === Estratégia completa do Playbook ===========================

export const PlaybookStrategySchema = z.object({
  bigIdea: z.string(),
  promise: z.string(),
  uniqueMechanism: z.string(),
  avatar: z.string(),
  pains: z.array(z.string()),
  desires: z.array(z.string()),
  objections: z.array(z.string()),
  mentalTriggers: z.array(z.string()),
  headlines: z.array(z.string()),
  vslStructure: z.string(),
  pageStructure: z.string(),
  funnel: z.string(),
  offer: z.string(),
  bonuses: z.array(z.string()),
  stack: z.string(),
  cta: z.string(),
  scripts: z.array(z.string()),
  angles: z.array(z.string()),
  scale: z.string(),
});
export type PlaybookStrategy = z.infer<typeof PlaybookStrategySchema>;

export async function aiGeneratePlaybookStrategy(
  briefing: PlaybookBriefing,
): Promise<PlaybookStrategy> {
  const data = (await aiChat({
    model: "google/gemini-3-flash-preview",
    messages: [
      {
        role: "system",
        content:
          "Você é estrategista sênior de marketing direto. Gera estratégias completas de lançamento em PT-BR. Devolva via ferramenta `strategy`.",
      },
      {
        role: "user",
        content: `Briefing do produto:\n${JSON.stringify(briefing, null, 2)}\n\nGere a estratégia completa: bigIdea, promise (refinada), uniqueMechanism (refinado), avatar (descrição rica), pains (5), desires (5), objections (5), mentalTriggers (6, ex: escassez, prova, autoridade…), headlines (8 variações fortes), vslStructure (markdown com blocos numerados Hook→Problema→Mecanismo→Prova→Oferta→CTA), pageStructure (markdown com 10 dobras), funnel (descreva funil completo: tráfego, captura, VSL, oferta, OB, upsell, downsell), offer (oferta principal completa), bonuses (4 bônus), stack (stack de valor empilhado), cta (CTA principal), scripts (3 scripts curtos: Reels, WhatsApp, e-mail), angles (5 ângulos criativos), scale (plano de escala em 30/60/90 dias).`,
      },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "strategy",
          parameters: {
            type: "object",
            properties: {
              bigIdea: { type: "string" },
              promise: { type: "string" },
              uniqueMechanism: { type: "string" },
              avatar: { type: "string" },
              pains: { type: "array", items: { type: "string" } },
              desires: { type: "array", items: { type: "string" } },
              objections: { type: "array", items: { type: "string" } },
              mentalTriggers: { type: "array", items: { type: "string" } },
              headlines: { type: "array", items: { type: "string" } },
              vslStructure: { type: "string" },
              pageStructure: { type: "string" },
              funnel: { type: "string" },
              offer: { type: "string" },
              bonuses: { type: "array", items: { type: "string" } },
              stack: { type: "string" },
              cta: { type: "string" },
              scripts: { type: "array", items: { type: "string" } },
              angles: { type: "array", items: { type: "string" } },
              scale: { type: "string" },
            },
            required: [
              "bigIdea","promise","uniqueMechanism","avatar","pains","desires","objections",
              "mentalTriggers","headlines","vslStructure","pageStructure","funnel","offer",
              "bonuses","stack","cta","scripts","angles","scale",
            ],
            additionalProperties: false,
          },
        },
      },
    ],
    tool_choice: { type: "function", function: { name: "strategy" } },
  })) as any;
  const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ?? "{}";
  return PlaybookStrategySchema.parse(JSON.parse(args));
}