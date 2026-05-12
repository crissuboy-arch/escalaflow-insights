import { z } from "zod";
import type { StandaloneBriefing } from "./standalone/briefing";

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

export const SalesCopySchema = z.object({
  headline: z.string(),
  subheadline: z.string(),
  bigIdea: z.string(),
  uniqueMechanism: z.string(),
  promise: z.string(),
  bullets: z.array(z.string()).min(3),
  benefits: z.array(z.string()).min(3),
  pains: z.array(z.string()).default([]),
  desires: z.array(z.string()).default([]),
  objections: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
  angles: z.array(z.string()).default([]),
  offer: z.string(),
  guarantee: z.string(),
  cta: z.string(),
  fullCopy: z.string(),
});

export type SalesCopy = z.infer<typeof SalesCopySchema>;

export type CopyContext = {
  productName: string;
  productType: string;
  description: string;
  niche: string;
  audience: string;
  promise: string;
  price?: string;
  platform?: string;
  link?: string;
  tone?: string;
  // Optional from project briefing
  uniqueMechanism?: string;
  pains?: string[];
  desires?: string[];
};

export function briefingToContext(b: StandaloneBriefing): CopyContext {
  return { ...b };
}

const SYSTEM = `Você é um copywriter direto-resposta brasileiro de elite (Eugene Schwartz + Stefan Georgi + Justin Goff). Escreve copies que vendem em PT-BR com gatilhos mentais fortes, claros e específicos. Sempre devolve JSON válido conforme o schema pedido. Sem markdown, sem comentários, apenas JSON.`;

function buildPrompt(ctx: CopyContext) {
  return `Crie uma copy de vendas COMPLETA para o produto abaixo.

PRODUTO: ${ctx.productName}
TIPO: ${ctx.productType}
DESCRIÇÃO: ${ctx.description || "—"}
NICHO: ${ctx.niche || "—"}
PÚBLICO: ${ctx.audience || "—"}
PROMESSA: ${ctx.promise || "—"}
PREÇO: ${ctx.price || "—"}
PLATAFORMA: ${ctx.platform || "—"}
LINK: ${ctx.link || "—"}
TOM: ${ctx.tone || "persuasivo, próximo, confiante"}
MECANISMO ÚNICO (se houver): ${ctx.uniqueMechanism || "—"}
DORES CONHECIDAS: ${(ctx.pains ?? []).join(" · ") || "—"}
DESEJOS CONHECIDOS: ${(ctx.desires ?? []).join(" · ") || "—"}

Devolva EXATAMENTE este JSON (sem nada antes ou depois):
{
  "headline": "string curta e magnética (até 90 chars)",
  "subheadline": "string complementar (até 140 chars)",
  "bigIdea": "a grande ideia em 1 frase",
  "uniqueMechanism": "o mecanismo único que entrega a promessa",
  "promise": "promessa principal reformulada e tangível",
  "bullets": ["6 a 10 bullets curtos com benefícios + curiosidade"],
  "benefits": ["6 benefícios tangíveis"],
  "pains": ["5 dores do público"],
  "desires": ["5 desejos do público"],
  "objections": [{"q":"objeção","a":"resposta curta e convincente"}],
  "angles": ["5 ângulos de campanha distintos"],
  "offer": "descrição da oferta completa (produto + bônus + condição)",
  "guarantee": "frase de garantia",
  "cta": "CTA principal (até 60 chars)",
  "fullCopy": "copy longa completa em markdown, pronta para colar numa página de vendas, com headline, subheadline, lead, dor, mecanismo, benefícios, prova, oferta, bônus, garantia, FAQ e CTA"
}`;
}

export async function aiGenerateCopy(ctx: CopyContext): Promise<SalesCopy> {
  const res = await aiChat({
    model: "google/gemini-3-flash-preview",
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: buildPrompt(ctx) },
    ],
    response_format: { type: "json_object" },
  });
  const r = res as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = r.choices?.[0]?.message?.content ?? "{}";
  const parsed = safeJSON(content);
  return SalesCopySchema.parse(parsed);
}