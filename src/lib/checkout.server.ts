import { z } from "zod";
import type { StandaloneBriefing } from "./standalone/briefing";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

function getKey() {
  const k = process.env.LOVABLE_API_KEY;
  if (!k) throw new Error("LOVABLE_API_KEY ausente — habilite Lovable Cloud.");
  return k;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function aiChat(body: Record<string, unknown>): Promise<unknown> {
  const key = getKey();
  const delays = [0, 1200, 3000];
  let lastErr: unknown;
  for (let attempt = 0; attempt < delays.length; attempt++) {
    if (delays[attempt]) await sleep(delays[attempt]);
    const res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
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

export const CheckoutOfferSchema = z.object({
  oferta: z.string(),
  stack: z.array(z.string()).min(3),
  bonus: z
    .array(
      z.object({
        nome: z.string(),
        valorPercebido: z.string(),
        descricao: z.string(),
      }),
    )
    .min(2),
  garantia: z.string(),
  orderBump: z.object({ titulo: z.string(), descricao: z.string(), preco: z.string() }),
  upsell: z.object({ titulo: z.string(), descricao: z.string(), preco: z.string() }),
  downsell: z.object({ titulo: z.string(), descricao: z.string(), preco: z.string() }),
  ancoragem: z.object({ de: z.string(), por: z.string(), justificativa: z.string() }),
  urgencia: z.string(),
  cta: z.string(),
  kiwify: z.string(),
  hotmart: z.string(),
  stripe: z.string(),
});

export type CheckoutOffer = z.infer<typeof CheckoutOfferSchema>;

export type CheckoutContext = {
  productName: string;
  productType: string;
  description?: string;
  niche?: string;
  audience?: string;
  promise?: string;
  price?: string;
};

export function briefingToCheckoutCtx(b: StandaloneBriefing): CheckoutContext {
  return {
    productName: b.productName,
    productType: b.productType,
    description: b.description,
    niche: b.niche,
    audience: b.audience,
    promise: b.promise,
    price: b.price,
  };
}

const SYSTEM = `Você é um especialista brasileiro em ofertas irresistíveis estilo Russell Brunson + Pedro Sobral. Sempre devolve JSON válido conforme o schema. PT-BR, direto, persuasivo, com gatilhos mentais. Sem markdown.`;

function buildPrompt(ctx: CheckoutContext) {
  return `Crie a estrutura COMPLETA de oferta + checkout para o produto abaixo.

PRODUTO: ${ctx.productName}
TIPO: ${ctx.productType}
DESCRIÇÃO: ${ctx.description || "—"}
NICHO: ${ctx.niche || "—"}
PÚBLICO: ${ctx.audience || "—"}
PROMESSA: ${ctx.promise || "—"}
PREÇO ALVO: ${ctx.price || "—"}

Devolva EXATAMENTE este JSON:
{
  "oferta": "descrição completa da oferta principal (3-5 frases, com tudo que está incluso)",
  "stack": ["item 1 do stack de valor com valor R$ X", "item 2", "item 3", "..."],
  "bonus": [{"nome":"Nome do bônus","valorPercebido":"R$ 197","descricao":"breve explicação do que entrega"}],
  "garantia": "frase de garantia (incondicional, prazo, política)",
  "orderBump": {"titulo":"Adicione X por apenas R$ Y","descricao":"copy curta de 1-2 frases","preco":"R$ 27"},
  "upsell": {"titulo":"Upsell premium","descricao":"copy de 2-3 frases para tela após compra","preco":"R$ 197"},
  "downsell": {"titulo":"Última chance","descricao":"copy de 2-3 frases","preco":"R$ 47"},
  "ancoragem": {"de":"R$ 997","por":"R$ 197","justificativa":"frase explicando o desconto/oportunidade"},
  "urgencia": "frase de escassez/urgência genuína (vagas limitadas, bônus por tempo, etc.)",
  "cta": "texto do botão de checkout (até 40 chars)",
  "kiwify": "Bloco de texto pronto para colar no Kiwify, no formato: Nome do produto / Descrição curta / Descrição longa / Preço / Garantia / Bônus listados",
  "hotmart": "Bloco pronto para Hotmart: Nome / Subtítulo / Descrição / Preço de venda / Preço promocional / Garantia / Materiais inclusos",
  "stripe": "Bloco pronto para Stripe: Product name / Statement descriptor / Description / Pricing tier / Trial / Refund policy"
}`;
}

export async function aiGenerateCheckoutOffer(ctx: CheckoutContext): Promise<CheckoutOffer> {
  const res = await aiChat({
    model: "google/gemini-3-flash-preview",
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: buildPrompt(ctx) },
    ],
    response_format: { type: "json_object" },
  });
  const r = res as { choices?: Array<{ message?: { content?: string } }> };
  const content = r.choices?.[0]?.message?.content ?? "{}";
  return CheckoutOfferSchema.parse(safeJSON(content));
}