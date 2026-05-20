import { z } from "zod";
import type { StandaloneBriefing } from "./standalone/briefing";
import {
  findFormat,
  findObjective,
  findPlatform,
  type AdsFormatId,
  type Dimension,
  type ObjectiveId,
  type PlatformId,
} from "./ads/catalog";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

function getKey() {
  const k = process.env.LOVABLE_API_KEY;
  if (!k) throw new Error("LOVABLE_API_KEY ausente — habilite Lovable Cloud.");
  return k;
}
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
async function aiChat(body: Record<string, unknown>): Promise<unknown> {
  const key = getKey();
  const delays = [0, 1200, 3000];
  let lastErr: unknown;
  for (let attempt = 0; attempt < delays.length; attempt++) {
    if (delays[attempt]) await sleep(delays[attempt]);
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
  }
  throw lastErr instanceof Error ? lastErr : new Error("Falha de IA");
}
function safeJSON(raw: unknown): unknown {
  if (typeof raw !== "string") return raw ?? {};
  try {
    return JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        return {};
      }
    }
    return {};
  }
}

export const CreativeSchema = z.object({
  hook: z.string(),
  headline: z.string(),
  cta: z.string(),
  copy: z.string(),
  visualPrompt: z.string(),
  estrutura: z.string(),
  emocao: z.string(),
  angulo: z.string(),
  body: z.string().default(""),
  caption: z.string().default(""),
  shortScript: z.string().default(""),
  imagePrompt: z.string().default(""),
  videoPrompt: z.string().default(""),
  hookVariations: z.array(z.string()).default([]),
  performanceNotes: z.string().default(""),
  targetSegment: z.string().default(""),
  mentalTrigger: z.string().default(""),
});
export type Creative = z.infer<typeof CreativeSchema>;

export const CreativeListSchema = z.object({ creatives: z.array(CreativeSchema).min(1) });

export type CreativeBriefing = {
  productName: string;
  productType: string;
  description?: string;
  niche?: string;
  audience?: string;
  promise?: string;
  price?: string;
  platform?: string;
  link?: string;
  tone?: string;
  // optional from project
  bigIdea?: string;
  uniqueMechanism?: string;
  pains?: string[];
  desires?: string[];
};

export function fromStandalone(b: StandaloneBriefing): CreativeBriefing {
  return { ...b };
}

const SYSTEM = `Você é o diretor criativo de performance com mais criativos vencedores do Brasil. Combina:
- Metodologia de hook 0-3s que para o scroll instantaneamente
- Padrão de interrupção (pattern break) para cada formato e plataforma
- Micro-storytelling que cria identificação com o avatar em 5 segundos
- Estrutura AIDA aplicada a formatos curtos (Reels, Stories, Feed)
- Prova social nativa que não parece anúncio

REGRAS ABSOLUTAS:
1. O hook DEVE parar o scroll em 3 segundos — use número, contradição, pergunta provocativa ou afirmação ousada.
2. Cada criativo tem um ângulo DISTINTO — emoção diferente, segmento diferente do avatar.
3. O CTA deve gerar ação IMEDIATA — não "saiba mais" genérico.
4. hookVariations = 3 variações do hook principal para teste A/B (mesmo ângulo, abertura diferente).
5. performanceNotes = análise de por que este criativo vai (ou não vai) performar nesta plataforma/formato.
6. Sempre JSON válido, sem markdown, sem texto fora do JSON.`;

function userPrompt(opts: {
  briefing: CreativeBriefing;
  platform: PlatformId;
  objective: ObjectiveId;
  formatId: AdsFormatId;
  dimension: Dimension;
  variations?: number;
}) {
  const fmt = findFormat(opts.formatId);
  const plat = findPlatform(opts.platform);
  const obj = findObjective(opts.objective);
  const b = opts.briefing;
  const n = opts.variations ?? 1;

  const isVideo = ["tiktok", "instagram", "facebook", "shorts"].includes(opts.platform) &&
    ["9:16"].includes(opts.dimension);

  return `Crie ${n === 1 ? "1 criativo" : `${n} criativos DISTINTOS`} de anúncio.

PLATAFORMA: ${plat?.name} (${plat?.desc})
OBJETIVO: ${obj?.name} — ${obj?.desc}
FORMATO: ${fmt?.name} — ${fmt?.description}
GATILHO MENTAL DO FORMATO: ${(fmt as { gatilho?: string } | undefined)?.gatilho ?? "—"}
USO ESTRATÉGICO DO FORMATO: ${(fmt as { uso?: string } | undefined)?.uso ?? "—"}
DIMENSÃO: ${opts.dimension}
TIPO PRINCIPAL: ${isVideo ? "vídeo vertical (roteiro com cortes/falas)" : "estática (composição visual)"}

PRODUTO: ${b.productName} (${b.productType})
DESCRIÇÃO: ${b.description || "—"}
NICHO: ${b.niche || "—"}
PÚBLICO: ${b.audience || "—"}
PROMESSA: ${b.promise || "—"}
PREÇO: ${b.price || "—"}
TOM: ${b.tone || "próximo, confiante"}
BIG IDEA (se houver): ${b.bigIdea || "—"}
MECANISMO ÚNICO: ${b.uniqueMechanism || "—"}
DORES: ${(b.pains ?? []).join(" · ") || "—"}
DESEJOS: ${(b.desires ?? []).join(" · ") || "—"}

Devolva EXATAMENTE este JSON:
{
  "creatives": [
    {
      "hook": "primeira frase/abertura magnética (2 segundos)",
      "headline": "headline curta (até 80 chars)",
      "cta": "CTA específico (até 50 chars)",
      "copy": "${isVideo ? "roteiro completo com cortes [CORTE 1] [CORTE 2]…" : "copy completa do criativo"}",
      "body": "corpo de texto principal do criativo em PT-BR — pronto para ser sobreposto na peça (sem markdown, frases diretas, quebras de linha curtas)",
      "caption": "legenda pronta para Instagram/TikTok/Facebook em PT-BR com gancho na 1ª linha, micro-storytelling, CTA e 5 hashtags relevantes ao final",
      "shortScript": "roteiro curto de 15–30s para vídeo vertical com [CENA 1], [CENA 2], [CENA 3] e fala/legenda em cada cena — mesmo se o formato for estático, descreva como adaptar para vídeo",
      "imagePrompt": "prompt em INGLÊS pronto para Midjourney/DALL·E/Nano Banana descrevendo composição, cores, mood, tipografia e detalhes específicos do formato ${fmt?.name}. Inclua aspect ratio ${opts.dimension}.",
      "videoPrompt": "prompt em INGLÊS pronto para Sora/Runway/Veo descrevendo cenas, movimento de câmera, iluminação e duração total (~15s). Aspect ratio ${opts.dimension}.",
      "visualPrompt": "(mesmo conteúdo de imagePrompt — manter retrocompatibilidade)",
      "estrutura": "descrição rápida da estrutura do criativo (camadas, ordem visual)",
      "emocao": "emoção dominante a evocar",
      "angulo": "ângulo criativo desta peça",
      "hookVariations": ["variação do hook 1 — mesmo ângulo, abertura diferente", "variação 2", "variação 3"],
      "performanceNotes": "análise objetiva: por que este criativo vai performar nesta plataforma/formato — pontos fortes e riscos",
      "targetSegment": "segmento específico do avatar que este criativo alcança melhor",
      "mentalTrigger": "gatilho mental principal deste criativo e como está aplicado"
    }${n > 1 ? "  // repita variando hook, ângulo e composição" : ""}
  ]
}`;
}

export async function aiGenerateCreative(opts: {
  briefing: CreativeBriefing;
  platform: PlatformId;
  objective: ObjectiveId;
  formatId: AdsFormatId;
  dimension: Dimension;
}): Promise<Creative> {
  const res = await aiChat({
    model: "google/gemini-3-flash-preview",
    temperature: 0.85,
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: userPrompt({ ...opts, variations: 1 }) },
    ],
    response_format: { type: "json_object" },
  });
  const r = res as { choices?: Array<{ message?: { content?: string } }> };
  const parsed = CreativeListSchema.parse(safeJSON(r.choices?.[0]?.message?.content ?? "{}"));
  return parsed.creatives[0];
}

export async function aiGenerateCreativeVariations(opts: {
  briefing: CreativeBriefing;
  platform: PlatformId;
  objective: ObjectiveId;
  formatId: AdsFormatId;
  dimension: Dimension;
  count?: number;
}): Promise<Creative[]> {
  const n = Math.min(Math.max(opts.count ?? 3, 2), 5);
  const res = await aiChat({
    model: "google/gemini-3-flash-preview",
    temperature: 0.9,
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: userPrompt({ ...opts, variations: n }) },
    ],
    response_format: { type: "json_object" },
  });
  const r = res as { choices?: Array<{ message?: { content?: string } }> };
  const parsed = CreativeListSchema.parse(safeJSON(r.choices?.[0]?.message?.content ?? "{}"));
  return parsed.creatives;
}