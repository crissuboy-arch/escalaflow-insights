import { z } from "zod";
import { generateAIResponse, generateAIJson } from "./aiService";
import { AGENT_HORMOZI_OFFERS, withAgent } from "./agents";

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
    "Você é um analista de marketing direto especializado em extrair posicionamento estratégico de anúncios de tráfego pago. Lê o anúncio e extrai o briefing profundo do produto. Responda SOMENTE com JSON válido sem texto extra.";
  const userPrompt = `Analise este anúncio e extraia o briefing estratégico completo do produto.

Anunciante: ${ad.advertiser ?? "—"}
Headline: ${ad.headline ?? "—"}
Copy: ${ad.copy ?? "—"}
CTA: ${ad.cta ?? "—"}
Nicho: ${ad.niche ?? "—"} | Plataforma: ${ad.platform ?? "—"}

Retorne JSON com EXATAMENTE estes campos:
{
  "title": "título do produto ou curso (infira do anúncio)",
  "niche": "nicho específico (não genérico)",
  "promise": "promessa principal como resultado tangível, específico e temporal",
  "avatar": "descrição rica do avatar ideal: quem é, situação atual, dor principal, desejo profundo",
  "uniqueMechanism": "mecanismo único que entrega a promessa — com nome proprietário se identificável",
  "pains": ["5 dores específicas ao nicho identificadas no anúncio ou inferidas"],
  "desires": ["5 desejos específicos como resultados concretos"]
}`;

  const raw = await generateAIJson<PlaybookBriefing>(userPrompt, { systemPrompt });
  return PlaybookBriefingSchema.parse(raw);
}

export async function aiGenerateSceneOutline(briefing: PlaybookBriefing, sceneCount: number): Promise<SceneOutline[]> {
  const systemPrompt =
    "Você é um especialista em design instrucional e conteúdo educacional para infoprodutos. Cria sequências de aprendizado com progressão lógica e didática clara. Responda SOMENTE com JSON válido sem texto extra.";
  const userPrompt = `Crie o roteiro de ${sceneCount} cenas para o playbook abaixo. Cada cena deve ter progressão lógica — do problema à solução, do simples ao complexo.

Briefing do produto:
- Título: ${briefing.title}
- Nicho: ${briefing.niche}
- Promessa: ${briefing.promise}
- Avatar: ${briefing.avatar}
- Mecanismo único: ${briefing.uniqueMechanism}

Retorne JSON com formato:
{
  "scenes": [
    {
      "title": "título curto e específico da cena",
      "summary": "o que o aluno vai aprender/fazer nesta cena (1-2 frases específicas ao tema)",
      "exercise": "pergunta reflexiva que conecta o conteúdo à realidade do avatar",
      "practicalAction": "tarefa concreta que pode ser executada em menos de 30 minutos"
    }
  ]
}

A cena 1 deve identificar o problema core. As cenas do meio ensinam o mecanismo. A última cena entrega a transformação.`;

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
    "Você escreve conteúdo educacional em PT-BR com tom premium, direto e inspirador. Combina ensinamento prático com linguagem acessível. 180-280 palavras por cena. Responda SOMENTE com JSON válido sem texto extra.";
  const userPrompt = `Escreva o conteúdo desta cena do playbook. Tom: ${index === 0 ? "identificação com o problema" : index === total - 1 ? "celebração da transformação" : "ensinamento prático e motivador"}.

Produto: ${briefing.title} | Nicho: ${briefing.niche}
Avatar: ${briefing.avatar}
Promessa do produto: ${briefing.promise}

Cena ${index + 1}/${total}: ${scene.title}
O que ensinar: ${scene.summary}
Exercício: ${scene.exercise}
Ação prática: ${scene.practicalAction}

Retorne JSON:
{
  "text": "conteúdo da cena em 180-280 palavras — começa identificando o avatar na situação, ensina o conceito específico desta cena, termina preparando para a próxima",
  "balloons": ["frase de destaque 1 (máx 80 chars)", "frase de destaque 2", "frase de destaque 3"]
}
Máximo 4 balloons. Cada balloon é uma frase-chave que resume o insight principal.`;

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
    "Você é um roteirista de vídeo especializado em conteúdo educacional para YouTube e Reels. Converte playbooks em roteiros que ensinam E entretêm. Tom: próximo, específico, sem jargão. Saída em Markdown com cabeçalhos por cena, narração e sugestões de cortes visuais.";
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
  const systemPrompt = withAgent(AGENT_HORMOZI_OFFERS, `Você é o consultor de marketing direto mais caro do Brasil — combina Eugene Schwartz (big idea), Alex Hormozi (oferta irresistível), Russell Brunson (funis) e Rich Schefren (estratégia de posicionamento).

REGRAS ABSOLUTAS:
1. Seja ESPECÍFICO ao produto "${briefing.title}" no nicho "${briefing.niche}" — nada genérico.
2. O mecanismo único PRECISA ter nome proprietário (não use o que está no briefing se for genérico — renomeie com criatividade).
3. A big idea deve ser disruptiva: contradiz o senso comum mas é 100% plausível.
4. Headlines com números, contradição ou promessa específica — nunca genéricas.
5. O VSL deve soar como conversa gravada, não texto escrito.
6. Responda SOMENTE com JSON válido sem texto extra.`);

  const userPrompt = `Briefing do produto:
- Título: ${briefing.title}
- Nicho: ${briefing.niche}
- Promessa: ${briefing.promise}
- Avatar: ${briefing.avatar}
- Mecanismo: ${briefing.uniqueMechanism}
- Dores: ${briefing.pains.join(" | ")}
- Desejos: ${briefing.desires.join(" | ")}

Gere a estratégia completa com os seguintes campos JSON — seja ESPECÍFICO ao produto e nicho acima:
{
  "bigIdea": "a grande ideia central disruptiva que posiciona este produto de forma única (contradiz o senso comum do nicho mas é plausível)",
  "promise": "promessa refinada como resultado tangível, específico e temporal (ex: 'X resultado em Y dias sem Z obstáculo')",
  "uniqueMechanism": "nome proprietário do mecanismo + explicação em 1-2 frases de como entrega a promessa",
  "avatar": "descrição rica do avatar: demografia, psicografia, dor principal e origem, desejo profundo, medo oculto, monólogo interno",
  "pains": ["5 dores específicas ao nicho com profundidade emocional"],
  "desires": ["5 desejos específicos como resultados concretos e mensuráveis"],
  "objections": ["5 objeções reais do avatar + como quebrar cada uma (formato: 'Objeção: [X] → Quebra: [Y]')"],
  "mentalTriggers": ["6 gatilhos mentais com como aplicar especificamente a este produto (formato: '[Gatilho]: [aplicação específica]')"],
  "headlines": ["8 headlines distintas variando: dor, desejo, curiosidade, prova, contra-intuitivo, específico, transformação, mecanismo"],
  "vslStructure": "roteiro de VSL em markdown com blocos: [HOOK 0-15s] → [IDENTIFICAÇÃO] → [AMPLIFICAÇÃO DE DOR] → [BIG IDEA] → [MECANISMO ÚNICO] → [PROVA] → [OFERTA] → [BÔNUS] → [GARANTIA] → [URGÊNCIA] → [CTA]",
  "pageStructure": "wireframe da sales page em markdown com 10 seções numeradas: 1-Hero, 2-Lead, 3-Dor, 4-Big Idea, 5-Mecanismo, 6-Prova, 7-Benefícios, 8-Oferta+Stack, 9-Garantia+Urgência, 10-FAQ+CTA",
  "funnel": "funil completo em texto: Tráfego → Landing de Captura → VSL Page → Checkout → Order Bump → Upsell → Downsell → E-mail de Entrega. Descreva copy e objetivo de cada etapa.",
  "offer": "oferta principal completa com stack de valor: produto + bônus + garantia + âncora de preço + urgência",
  "bonuses": ["4 bônus específicos com nome + valor percebido + por que resolve objeção"],
  "stack": "stack de valor empilhado em formato lista: cada item com nome e valor percebido, total percebido vs preço pedido",
  "cta": "CTA principal com urgência implícita (até 60 chars)",
  "scripts": [
    "Script Reels 30s: [HOOK 0-3s] → [DOR 3-10s] → [BIG IDEA 10-20s] → [CTA 20-30s]",
    "Script WhatsApp: mensagem de 5-8 linhas com gancho, identificação, promessa e link",
    "Script E-mail: assunto magnético + corpo de 150 palavras com história, mecanismo e CTA"
  ],
  "angles": ["5 ângulos criativos DISTINTOS: nome + emoção + formato + segmento do avatar + hook de abertura"],
  "scale": "plano de escala em 3 fases: 30 dias (validar), 60 dias (otimizar e escalar), 90 dias (dominar nicho) — com orçamento e KPIs por fase"
}`;

  const raw = await generateAIJson<PlaybookStrategy>(userPrompt, { systemPrompt, maxTokens: 8192 });
  return PlaybookStrategySchema.parse(raw);
}
