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

export const SalesPageSchema = z.object({
  hero: z.string().default(""),
  headline: z.string().default(""),
  subheadline: z.string().default(""),
  aboveTheFold: z.string().default(""),
  lead: z.string().default(""),
  dor: z.string().default(""),
  mecanismo: z.string().default(""),
  bigIdea: z.string().default(""),
  beneficios: z.array(z.string()).default([]),
  objecoes: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
  depoimentos: z.array(z.object({ nome: z.string(), texto: z.string(), resultado: z.string().default("") })).default([]),
  oferta: z.string().default(""),
  bonus: z.array(z.string()).default([]),
  garantia: z.string().default(""),
  urgencia: z.string().default(""),
  faq: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
  cta: z.string().default(""),
  ctaSecondary: z.string().default(""),
  estruturaVisual: z.string().default(""),
  croNotes: z.string().default(""),
  mobileOptimization: z.string().default(""),
});

export type SalesPage = z.infer<typeof SalesPageSchema>;

export type PageContext = {
  productName: string;
  productType: string;
  description: string;
  niche: string;
  audience: string;
  promise: string;
  price?: string;
  guarantee?: string;
  bonus?: string;
  tone?: string;
  uniqueMechanism?: string;
  pains?: string[];
  desires?: string[];
};

export function briefingToContext(b: StandaloneBriefing): PageContext {
  return { ...b };
}

const SYSTEM = `Você é o copywriter de resposta direta + analista de CRO mais eficaz do Brasil. Especializado em sales pages de alta conversão.
Combina: Gary Halbert (storytelling e lead), Dan Kennedy (urgência e oferta), Joanna Wiebe (copy orientada a dados e voz do cliente), Peep Laja (CRO, testes, above-the-fold).

REGRAS ABSOLUTAS:
1. Above-the-fold = os primeiros 600px que o visitante vê. Deve conter: headline magnética + subheadline + 1 elemento de prova social + CTA. Quem sai sem rolar não voltará.
2. A headline PRECISA ser específica: números, prazo, mecanismo único ou contradição. Nunca genérica.
3. A seção de DOR deve fazer o avatar pensar "é exatamente o que estou sentindo" — específica ao nicho, não clichê.
4. Depoimentos devem ter resultado mensurável (ex: "perdi 8kg em 45 dias" — não "produto incrível").
5. O CTA principal deve criar urgência implícita e aparecer pelo menos 3x na página.
6. croNotes = as 3 mudanças de maior impacto para aumentar conversão nesta página específica.
7. Sempre JSON válido, sem markdown, sem comentários, apenas JSON.`;

function buildPrompt(ctx: PageContext) {
  return `Crie a estrutura COMPLETA e PROFUNDA de uma página de vendas para o produto abaixo. Seja específico ao nicho e avatar — sem copy genérica.

PRODUTO: ${ctx.productName}
TIPO: ${ctx.productType}
DESCRIÇÃO: ${ctx.description || "—"}
NICHO: ${ctx.niche || "—"}
PÚBLICO-ALVO: ${ctx.audience || "—"}
PROMESSA: ${ctx.promise || "—"}
PREÇO: ${ctx.price || "—"}
GARANTIA: ${ctx.guarantee || "—"}
BÔNUS: ${ctx.bonus || "—"}
TOM: ${ctx.tone || "persuasivo, próximo, confiante — como amigo especialista"}
MECANISMO ÚNICO: ${ctx.uniqueMechanism || "criar nome proprietário"}
DORES: ${(ctx.pains ?? []).join(" · ") || "mapear com base no nicho"}
DESEJOS: ${(ctx.desires ?? []).join(" · ") || "mapear com base no nicho"}

Devolva EXATAMENTE este JSON (sem nada antes ou depois):
{
  "hero": "frase curta e poderosa do hero — emocional ou disruptiva (até 110 chars)",
  "headline": "headline magnética com número, mecanismo ou promessa específica (até 90 chars)",
  "subheadline": "complemento que reforça a promessa e o avatar (até 140 chars)",
  "aboveTheFold": "bloco completo do above-the-fold (primeiros 600px): headline + subheadline + frase de prova social + CTA primário. Deve convencer o visitante a rolar em menos de 5 segundos.",
  "lead": "lead de 2-3 parágrafos: identificação profunda com o avatar — 'se você é como a maioria das pessoas que [situação específica]...'",
  "bigIdea": "a grande ideia central que posiciona este produto de forma única e disruptiva no nicho",
  "dor": "seção de dor expandida: 4-6 parágrafos que fazem o avatar pensar 'é exatamente isso' — específico ao nicho, sem clichê",
  "mecanismo": "explicação do mecanismo único com nome proprietário: como funciona, por que é diferente, prova interna (3-4 parágrafos)",
  "beneficios": ["8 a 12 benefícios tangíveis e mensuráveis — evitar genéricos como 'mude sua vida'"],
  "objecoes": [{"q": "objeção real e específica do avatar deste nicho", "a": "quebra direta, específica e convincente (não genérica)"}],
  "depoimentos": [{"nome": "Nome realista", "texto": "depoimento específico com resultado mensurável", "resultado": "resultado em números (ex: 8kg em 45 dias)"}],
  "oferta": "apresentação da oferta com stack de valor completo: produto principal + bônus + garantia + âncora de preço",
  "bonus": ["3 a 5 bônus com nome específico + valor percebido + por que resolve uma objeção"],
  "garantia": "frase de garantia que transfere risco total — tão forte que parece arriscada para você",
  "urgencia": "urgência e escassez específica e genuína — com razão real (não 'oferta limitada' genérico)",
  "faq": [{"q": "pergunta real que o avatar tem antes de comprar", "a": "resposta que quebra objeção e reforça a compra"}],
  "cta": "CTA principal com urgência implícita — aparece pelo menos 3x na página (até 60 chars)",
  "ctaSecondary": "CTA secundário para quem ainda não está convencido — mais suave, foco em garantia ou prova social",
  "estruturaVisual": "wireframe textual completo: ordem das seções, elementos visuais (mockup, ícones, selos), sugestão de cores e tipografia, sticky CTA mobile",
  "croNotes": "as 3 mudanças de CRO de maior impacto para aumentar a conversão desta página específica — com justificativa",
  "mobileOptimization": "adaptações específicas para mobile: o que priorizar, o que simplificar, sticky CTA, velocidade de carregamento"
}`;
}

export async function aiGenerateSalesPage(ctx: PageContext): Promise<SalesPage> {
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
  return SalesPageSchema.parse(safeJSON(content));
}

export type ExternalPrompts = {
  lovable: string;
  googleAiStudio: string;
  html: string;
  v0: string;
  claude: string;
};

function pageBlueprint(p: SalesPage, ctx: PageContext): string {
  return [
    `PRODUTO: ${ctx.productName} (${ctx.productType})`,
    `PÚBLICO: ${ctx.audience}`,
    `PROMESSA: ${ctx.promise}`,
    `PREÇO: ${ctx.price || "—"}`,
    ``,
    `HERO: ${p.hero}`,
    `HEADLINE: ${p.headline}`,
    `SUBHEADLINE: ${p.subheadline}`,
    ``,
    `LEAD:\n${p.lead}`,
    ``,
    `SEÇÃO DOR:\n${p.dor}`,
    ``,
    `SEÇÃO MECANISMO:\n${p.mecanismo}`,
    ``,
    `BENEFÍCIOS:\n${p.beneficios.map((b) => `- ${b}`).join("\n")}`,
    ``,
    `OBJEÇÕES:\n${p.objecoes.map((o) => `Q: ${o.q}\nA: ${o.a}`).join("\n\n")}`,
    ``,
    `DEPOIMENTOS:\n${p.depoimentos.map((d) => `- ${d.nome}: "${d.texto}"`).join("\n")}`,
    ``,
    `OFERTA:\n${p.oferta}`,
    ``,
    `BÔNUS:\n${p.bonus.map((b) => `- ${b}`).join("\n")}`,
    ``,
    `GARANTIA: ${p.garantia}`,
    ``,
    `FAQ:\n${p.faq.map((f) => `Q: ${f.q}\nA: ${f.a}`).join("\n\n")}`,
    ``,
    `CTA: ${p.cta}`,
    ``,
    `ESTRUTURA VISUAL:\n${p.estruturaVisual}`,
  ].join("\n");
}

export function buildExternalPrompts(p: SalesPage, ctx: PageContext): ExternalPrompts {
  const blueprint = pageBlueprint(p, ctx);

  const lovable = `Crie uma página de vendas completa em React + Tailwind + shadcn/ui (componentes existentes), responsiva, dark mode, com animações sutis (framer-motion).

Use design system com tokens semânticos do styles.css (sem cores hard-coded). Hero impactante, seções alternadas com glow neon, depoimentos em cards, FAQ em accordion, CTA fixo no mobile.

Conteúdo da página:

${blueprint}

Entregue arquivo único \`SalesPage.tsx\` pronto para colar em \`src/routes/_authenticated/\`.`;

  const googleAiStudio = `Gere um arquivo HTML único, autocontido, com Tailwind via CDN, página de vendas longa, responsiva, dark mode com acentos vibrantes. Use semântica correta (h1, sections, article), animações CSS sutis, sem dependências externas além do Tailwind CDN.

Conteúdo da página:

${blueprint}

Devolva apenas o HTML completo entre \`\`\`html ... \`\`\`.`;

  const v0 = `Crie uma sales page premium usando Next.js App Router + Tailwind + shadcn/ui. Use componentes shadcn (Card, Button, Accordion, Badge), Lucide icons, motion/react para animações. Layout responsivo, mobile-first, dark mode default. Inclua sticky CTA no mobile.

Conteúdo:

${blueprint}

Entregue como página em \`app/page.tsx\` com componentes auxiliares no mesmo arquivo.`;

  const claude = `Atue como diretor de arte + copywriter direto-resposta. Descreva e implemente uma página de vendas longa baseada no conteúdo abaixo. Defina:

1. Sistema de design (paleta, tipografia, espaçamentos, tom visual)
2. Wireframe seção por seção (Hero, Dor, Mecanismo, Benefícios, Prova, Oferta, Bônus, Garantia, FAQ, CTA)
3. HTML + Tailwind final, dark mode, responsivo, com microinterações descritas em comentários

Conteúdo:

${blueprint}`;

  const html = `Gere um arquivo HTML único, completo e autocontido (doctype, head, body) para uma página de vendas longa, dark mode com acentos vibrantes, mobile-first. Use apenas Tailwind via CDN (https://cdn.tailwindcss.com), Google Font Inter, ícones via SVG inline. Inclua: hero com gradient, seção dor, mecanismo, benefícios em grid, prova social, oferta com stack de valor, bônus em cards, garantia destacada, FAQ accordion (details/summary), CTA fixo no mobile (sticky bottom). Sem JS externo, sem dependências além do Tailwind CDN.

Conteúdo da página:

${blueprint}

Devolva APENAS o HTML completo entre \`\`\`html ... \`\`\`, sem comentários extras.`;

  return { lovable, googleAiStudio, html, v0, claude };
}