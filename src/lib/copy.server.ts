import { z } from "zod";
import type { StandaloneBriefing } from "./standalone/briefing";
import { AGENT_GARY_HALBERT, withAgent } from "./agents";
import { callGateway, safeJSON } from "@/lib/aiService";

const aiChat = callGateway;

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
  mentalTriggers: z.array(z.object({ trigger: z.string(), application: z.string(), copy: z.string() })).default([]),
  avatarInsight: z.string().default(""),
  awarenessLevel: z.string().default(""),
  offer: z.string(),
  guarantee: z.string(),
  cta: z.string(),
  fullCopy: z.string(),
  shortCopy: z.string().default(""),
  longCopy: z.string().default(""),
  checkoutCopy: z.string().default(""),
  vslScript: z.string().default(""),
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

const SYSTEM = withAgent(AGENT_GARY_HALBERT, `Você é o copywriter de resposta direta mais eficaz do Brasil — combina:
- Eugene Schwartz: big idea, sofisticação do mercado, amplificação de desejo
- Stefan Georgi: RMBC Method, copy emocional que converte em qualquer temperatura de tráfego
- Justin Goff: copy de baixo custo por lead, VSL que converte tráfego frio
- Dan Kennedy: urgência real, headlines magnéticas, copy de carta de vendas
- Gary Halbert: storytelling, identificação com o avatar, fluxo natural

REGRAS ABSOLUTAS — VIOLÁ-LAS É FALHAR:
1. NUNCA seja genérico. Cada elemento deve ser ESPECÍFICO ao produto e ao nicho fornecidos.
2. A big idea deve ser disruptiva — contradiz o óbvio, mas é 100% plausível.
3. O mecanismo único PRECISA ter nome proprietário (ex: "Método 3R", "Sistema Inversão"). Sem nome = falha.
4. Headlines devem ser magnéticas — números, contradição, promessa específica ou medo real.
5. O vslScript deve soar NATURAL quando gravado — como conversa, não texto escrito.
6. Bullets devem ter curiosidade + benefício (padrão: "Como [resultado] sem [objeção] — mesmo que [limitação]").
7. Sempre JSON válido, sem markdown, sem comentários, sem texto fora do JSON.`);

function buildPrompt(ctx: CopyContext) {
  return `Crie uma copy de vendas COMPLETA e PROFUNDA para o produto abaixo. Seja específico ao nicho e ao avatar — nada genérico.

PRODUTO: ${ctx.productName}
TIPO: ${ctx.productType}
DESCRIÇÃO: ${ctx.description || "—"}
NICHO: ${ctx.niche || "—"}
PÚBLICO-ALVO: ${ctx.audience || "—"}
PROMESSA ATUAL: ${ctx.promise || "—"}
PREÇO: ${ctx.price || "—"}
PLATAFORMA: ${ctx.platform || "—"}
LINK: ${ctx.link || "—"}
TOM: ${ctx.tone || "persuasivo, próximo, confiante — como amigo que entende do assunto"}
MECANISMO ÚNICO (se houver): ${ctx.uniqueMechanism || "CRIAR um nome proprietário para o mecanismo"}
DORES CONHECIDAS: ${(ctx.pains ?? []).join(" · ") || "mapear com base no nicho"}
DESEJOS CONHECIDOS: ${(ctx.desires ?? []).join(" · ") || "mapear com base no nicho"}

Devolva EXATAMENTE este JSON (sem nada antes ou depois):
{
  "headline": "headline magnética (até 90 chars) — use número, contradição, promessa específica ou medo real",
  "subheadline": "complemento que amplia a promessa e reforça o mecanismo (até 140 chars)",
  "bigIdea": "a grande ideia disruptiva em 1 frase — deve contradizer o senso comum do nicho mas ser 100% plausível",
  "uniqueMechanism": "nome proprietário do mecanismo + explicação em 1 frase (ex: 'Método Inversão 3R: ao invés de...')",
  "promise": "promessa reformulada como resultado tangível, específico e temporal (ex: 'Perder 8kg em 45 dias sem cortar carboidrato')",
  "bullets": ["6 a 10 bullets no padrão: Como [resultado] sem [objeção] — mesmo que [limitação comum]"],
  "benefits": ["6 a 8 benefícios tangíveis e mensuráveis — não genéricos"],
  "pains": ["5 dores ESPECÍFICAS ao nicho com profundidade emocional"],
  "desires": ["5 desejos ESPECÍFICOS como resultados concretos e mensuráveis"],
  "objections": [{"q": "objeção real e específica do avatar", "a": "quebra direta, específica e convincente"}],
  "angles": ["5 ângulos de campanha DISTINTOS (emoção + formato + segmento diferentes)"],
  "mentalTriggers": [
    {"trigger": "nome do gatilho (ex: Prova Social)", "application": "como aplicar ESPECIFICAMENTE a este produto", "copy": "frase de exemplo pronta para usar"}
  ],
  "avatarInsight": "insight psicológico profundo sobre o avatar: o que pensa às 3h da manhã, o medo que não conta para ninguém, o que deseja mas tem vergonha de admitir",
  "awarenessLevel": "nível de consciência do avatar: unaware|problem-aware|solution-aware|product-aware|most-aware — com justificativa",
  "offer": "descrição da oferta completa (produto principal + bônus + garantia + condição especial) em 3-4 frases",
  "guarantee": "frase de garantia que transfere o risco para você — tão forte que parece arriscada",
  "cta": "CTA principal com urgência implícita (até 60 chars)",
  "fullCopy": "copy longa completa em markdown, pronta para colar numa página de vendas. Estrutura: [HEADLINE] [SUBHEADLINE] [LEAD — identificação com avatar] [DOR — amplificação específica] [BIG IDEA — revelação] [MECANISMO ÚNICO — explicação] [PROVA — dados/depoimentos fictícios realistas] [BENEFÍCIOS — lista] [OFERTA — stack de valor] [BÔNUS] [GARANTIA] [URGÊNCIA] [FAQ 3 perguntas] [CTA]",
  "shortCopy": "copy de anúncio para Stories/Reels (até 350 chars): hook nos 2 primeiros segundos, dor específica, promessa, CTA",
  "longCopy": "copy longa estendida em markdown — versão mais detalhada e emocional que fullCopy, com mais prova social e storytelling",
  "checkoutCopy": "bloco de copy para checkout (até 600 chars em markdown): reforço da transformação + garantia + urgência + CTA urgente",
  "vslScript": "roteiro completo de VSL em markdown, tom conversacional (como fala, não como texto escrito). Estrutura: [HOOK 0-15s — para o scroll] [IDENTIFICAÇÃO 15-60s] [DOR — amplificação] [BIG IDEA — revelação disruptiva] [MECANISMO ÚNICO — nome proprietário + como funciona] [PROVA — história/dados] [OFERTA — apresentação] [BÔNUS — revelação um a um] [STACK DE VALOR — empilhamento] [GARANTIA] [URGÊNCIA] [CTA] [FECHA LOOP]"
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