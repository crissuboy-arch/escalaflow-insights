import { z } from "zod";
import type { StandaloneBriefing } from "./standalone/briefing";
import { AGENT_ALEX_HORMOZI, withAgent } from "./agents";
import { callGateway, safeJSON } from "@/lib/aiService";

const aiChat = callGateway;

export const CheckoutOfferSchema = z.object({
  oferta: z.string(),
  stack: z.array(z.string()).min(3),
  bonus: z
    .array(
      z.object({
        nome: z.string(),
        valorPercebido: z.string(),
        descricao: z.string(),
        porqueEsteBonus: z.string().default(""),
      }),
    )
    .min(2),
  garantia: z.string(),
  orderBump: z.object({ titulo: z.string(), descricao: z.string(), preco: z.string(), gatilho: z.string().default("") }),
  upsell: z.object({ titulo: z.string(), descricao: z.string(), preco: z.string(), pitch: z.string().default("") }),
  downsell: z.object({ titulo: z.string(), descricao: z.string(), preco: z.string(), pitch: z.string().default("") }),
  ancoragem: z.object({ de: z.string(), por: z.string(), justificativa: z.string() }),
  urgencia: z.string(),
  cta: z.string(),
  valueEquation: z.string().default(""),
  psychologicalStrategy: z.string().default(""),
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

const SYSTEM = withAgent(AGENT_ALEX_HORMOZI, `Você é o arquiteto de ofertas mais preciso do mercado digital brasileiro. Combina:
- Alex Hormozi: Value Equation (Resultado Sonhado × Probabilidade / Tempo × Esforço), stack de valor 10x-20x
- Russell Brunson: Perfect Webinar offer structure, value stacking, surprise bonuses
- Pedro Sobral: adaptação de ofertas ao mercado BR, compliance de plataformas (Hotmart, Kiwify)
- Dan Kennedy: urgência real, garantia impossível de recusar, ancoragem psicológica de preço

REGRAS ABSOLUTAS:
1. O stack de valor total DEVE ser 10x-20x o preço pedido (percepção de absurdo de valor).
2. Cada bônus deve resolver uma OBJEÇÃO ESPECÍFICA ou ampliar o DESEJO do avatar.
3. A garantia deve ser tão forte que pareça arriscada PARA VOCÊ, não para o cliente.
4. Order bump = solução COMPLEMENTAR que não compete com o produto principal.
5. valueEquation = análise explícita de como a oferta maximiza Resultado Sonhado e Probabilidade, e minimiza Tempo e Esforço.
6. Sempre JSON válido, sem markdown, sem texto fora do JSON.`);

function buildPrompt(ctx: CheckoutContext) {
  return `Arquitete a oferta COMPLETA e o checkout para o produto abaixo usando a Value Equation de Alex Hormozi:
Score de Valor = (Resultado Sonhado × Probabilidade de Realização) / (Tempo × Esforço)

PRODUTO: ${ctx.productName}
TIPO: ${ctx.productType}
DESCRIÇÃO: ${ctx.description || "—"}
NICHO: ${ctx.niche || "—"}
PÚBLICO: ${ctx.audience || "—"}
PROMESSA: ${ctx.promise || "—"}
PREÇO ALVO: ${ctx.price || "—"}

Devolva EXATAMENTE este JSON:
{
  "oferta": "descrição completa da oferta principal (3-5 frases, com tudo incluso, resultado específico e quem é para)",
  "stack": ["item 1 do stack com valor percebido: ex 'Módulo Principal — R$ 497'", "item 2", "..."],
  "bonus": [
    {
      "nome": "nome específico do bônus",
      "valorPercebido": "R$ 197",
      "descricao": "o que entrega em 2 frases (resultado específico)",
      "porqueEsteBonus": "qual objeção quebra ou qual desejo amplifica"
    }
  ],
  "garantia": "frase de garantia que transfere risco total — tão forte que parece arriscada para você",
  "orderBump": {
    "titulo": "Adicione [X complementar] por apenas R$ [Y baixo]",
    "descricao": "por que comprar agora junto — resultado + urgência em 1-2 frases",
    "preco": "R$ 27",
    "gatilho": "gatilho psicológico deste order bump (escassez, complementaridade, desconto exclusivo)"
  },
  "upsell": {
    "titulo": "Upsell: expansão natural do resultado principal",
    "descricao": "pitch de 2-3 frases para tela pós-compra: 'você acabou de tomar a melhor decisão... mas e se...'",
    "preco": "R$ 197",
    "pitch": "argumento central: 'você já tem X, por R$ Y a mais você consegue [resultado amplificado] em [tempo menor]'"
  },
  "downsell": {
    "titulo": "Última chance: versão menor",
    "descricao": "pitch de 2-3 frases para quem recusou o upsell",
    "preco": "R$ 47",
    "pitch": "argumento: 'sem problema — mas antes de ir, posso te oferecer apenas [elemento X] por R$ Y'"
  },
  "ancoragem": {
    "de": "R$ 997",
    "por": "R$ 197",
    "justificativa": "razão REAL e específica para o desconto (não inventada — bônus por tempo, lançamento, vagas, etc.)"
  },
  "urgencia": "frase de urgência genuína e específica — com razão real (não genérica como 'oferta limitada')",
  "cta": "texto do botão de checkout com urgência implícita (até 40 chars)",
  "valueEquation": "análise da Value Equation: como esta oferta maximiza Resultado Sonhado e Probabilidade, e minimiza Tempo e Esforço — com os números do stack",
  "psychologicalStrategy": "estratégia psicológica de ancoragem e precificação: como os números foram escolhidos, qual efeito causa na decisão",
  "kiwify": "Bloco pronto para colar no Kiwify: Nome do produto | Descrição curta (até 100 chars) | Descrição longa | Preço | Garantia (dias) | Bônus listados",
  "hotmart": "Bloco pronto para Hotmart: Nome | Subtítulo | Descrição | Preço de venda | Preço promocional | Garantia | Materiais inclusos (formato e quantidade)",
  "stripe": "Bloco pronto para Stripe: Product name | Statement descriptor (até 22 chars) | Description | Price | Trial days | Refund policy"
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