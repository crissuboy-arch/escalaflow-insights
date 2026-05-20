import { z } from "zod";
import { generateAIResponse, generateAIJson } from "../aiService";

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

export async function aiExtractPlaybookBriefing(ad: AdInput): Promise<PlaybookBriefing> {
  const systemPrompt =
    "Você destila anúncios em briefings de playbook (passo-a-passo). Responda SOMENTE com JSON válido sem texto extra.";
  const userPrompt = `Anunciante: ${ad.advertiser ?? "—"}
Headline: ${ad.headline ?? "—"}
Copy: ${ad.copy ?? "—"}
CTA: ${ad.cta ?? "—"}
Nicho: ${ad.niche ?? "—"} | Plataforma: ${ad.platform ?? "—"}

Retorne JSON com os campos: title, niche, promise, avatar, uniqueMechanism, pains (array), desires (array).`;

  const raw = await generateAIJson<PlaybookBriefing>(userPrompt, { systemPrompt });
  return PlaybookBriefingSchema.parse(raw);
}

export async function aiGenerateSceneOutline(briefing: PlaybookBriefing, sceneCount: number): Promise<SceneOutline[]> {
  const systemPrompt =
    "Você cria roteiros de playbook em cenas didáticas, divertidas e acionáveis. Responda SOMENTE com JSON válido sem texto extra.";
  const userPrompt = `Briefing: ${JSON.stringify(briefing)}

Crie EXATAMENTE ${sceneCount} cenas com progressão lógica do problema à solução.
Cada cena deve ter: title (curto), summary (1-2 linhas), exercise (pergunta reflexiva), practicalAction (tarefa concreta).
Retorne JSON com formato: { "scenes": [ { "title": "...", "summary": "...", "exercise": "...", "practicalAction": "..." } ] }`;

  const raw = await generateAIJson<{ scenes: SceneOutline[] }>(userPrompt, { systemPrompt });
  return z.array(SceneOutlineSchema).parse(raw.scenes ?? []);
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
  const systemPrompt =
    "Você escreve conteúdo de playbook em PT-BR, tom premium e divertido. 180-280 palavras por cena. Responda SOMENTE com JSON válido sem texto extra.";
  const userPrompt = `Briefing: ${JSON.stringify(briefing)}
Cena ${index + 1}/${total}: ${scene.title}
Resumo: ${scene.summary}
Exercício: ${scene.exercise}
Ação prática: ${scene.practicalAction}

Retorne JSON com formato: { "text": "conteúdo da cena...", "balloons": ["frase curta 1", "frase curta 2"] }
O campo balloons deve ter no máximo 4 frases curtas de destaque.`;

  const raw = await generateAIJson<SceneContent>(userPrompt, { systemPrompt });
  return SceneContentSchema.parse(raw);
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
  // Image generation is not supported by the current AI service; return empty string as placeholder.
  console.warn("[playbook] aiGenerateSceneImage: image generation not supported, returning placeholder");
  void prompt;
  return "";
}

export async function aiGenerateVideoScript(briefing: PlaybookBriefing, scenes: { title: string; text: string }[]): Promise<string> {
  const systemPrompt =
    "Você converte playbooks em roteiros de vídeo (YouTube/Reels). Saída em Markdown com cabeçalhos por cena, narração e sugestões de cortes.";
  const userPrompt = `Título: ${briefing.title}
Nicho: ${briefing.niche}
Avatar: ${briefing.avatar}
Promessa: ${briefing.promise}

Cenas:
${scenes.map((s, i) => `### Cena ${i + 1}: ${s.title}\n${s.text}`).join("\n\n")}`;

  const text = await generateAIResponse(userPrompt, { systemPrompt });
  if (!text.trim()) throw new Error("Roteiro vazio");
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
  const systemPrompt =
    "Você é estrategista sênior de marketing direto. Gera estratégias completas de lançamento em PT-BR. Responda SOMENTE com JSON válido sem texto extra.";
  const userPrompt = `Briefing do produto:
${JSON.stringify(briefing, null, 2)}

Gere a estratégia completa com os seguintes campos JSON:
- bigIdea: string
- promise: string (refinada)
- uniqueMechanism: string (refinado)
- avatar: string (descrição rica)
- pains: string[] (5 itens)
- desires: string[] (5 itens)
- objections: string[] (5 itens)
- mentalTriggers: string[] (6 itens, ex: escassez, prova, autoridade…)
- headlines: string[] (8 variações fortes)
- vslStructure: string (markdown com blocos numerados Hook→Problema→Mecanismo→Prova→Oferta→CTA)
- pageStructure: string (markdown com 10 dobras)
- funnel: string (funil completo: tráfego, captura, VSL, oferta, OB, upsell, downsell)
- offer: string (oferta principal completa)
- bonuses: string[] (4 bônus)
- stack: string (stack de valor empilhado)
- cta: string (CTA principal)
- scripts: string[] (3 scripts: Reels, WhatsApp, e-mail)
- angles: string[] (5 ângulos criativos)
- scale: string (plano de escala em 30/60/90 dias)`;

  const raw = await generateAIJson<PlaybookStrategy>(userPrompt, { systemPrompt, maxTokens: 8192 });
  return PlaybookStrategySchema.parse(raw);
}
