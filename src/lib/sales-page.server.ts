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
  lead: z.string().default(""),
  dor: z.string().default(""),
  mecanismo: z.string().default(""),
  beneficios: z.array(z.string()).default([]),
  objecoes: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
  depoimentos: z.array(z.object({ nome: z.string(), texto: z.string() })).default([]),
  oferta: z.string().default(""),
  bonus: z.array(z.string()).default([]),
  garantia: z.string().default(""),
  faq: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
  cta: z.string().default(""),
  estruturaVisual: z.string().default(""),
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

const SYSTEM = `Você é um copywriter direto-resposta brasileiro de elite especializado em páginas de venda longas (sales letter style). Escreve em PT-BR, claro, específico, com gatilhos mentais fortes. Sempre devolve JSON válido conforme o schema. Sem markdown, sem comentários, apenas JSON.`;

function buildPrompt(ctx: PageContext) {
  return `Crie a estrutura COMPLETA de uma página de vendas para o produto abaixo.

PRODUTO: ${ctx.productName}
TIPO: ${ctx.productType}
DESCRIÇÃO: ${ctx.description || "—"}
NICHO: ${ctx.niche || "—"}
PÚBLICO: ${ctx.audience || "—"}
PROMESSA: ${ctx.promise || "—"}
PREÇO: ${ctx.price || "—"}
GARANTIA: ${ctx.guarantee || "—"}
BÔNUS: ${ctx.bonus || "—"}
TOM: ${ctx.tone || "persuasivo, próximo, confiante"}
MECANISMO ÚNICO: ${ctx.uniqueMechanism || "—"}
DORES: ${(ctx.pains ?? []).join(" · ") || "—"}
DESEJOS: ${(ctx.desires ?? []).join(" · ") || "—"}

Devolva EXATAMENTE este JSON (sem nada antes ou depois):
{
  "hero": "frase forte do hero (até 110 chars)",
  "headline": "headline principal (até 90 chars)",
  "subheadline": "complemento (até 140 chars)",
  "lead": "lead/abertura curta de 2-3 parágrafos",
  "dor": "seção de dor expandida (3-5 parágrafos)",
  "mecanismo": "explicação do mecanismo único (3-4 parágrafos)",
  "beneficios": ["6 a 10 benefícios tangíveis"],
  "objecoes": [{"q":"objeção comum","a":"quebra curta e convincente"}],
  "depoimentos": [{"nome":"Nome fictício realista","texto":"depoimento curto"}],
  "oferta": "descrição da oferta completa, stack de valor com âncora de preço",
  "bonus": ["3 a 5 bônus específicos com nome + valor percebido"],
  "garantia": "frase de garantia",
  "faq": [{"q":"pergunta","a":"resposta"}],
  "cta": "CTA principal (até 60 chars)",
  "estruturaVisual": "descrição em texto da estrutura visual sugerida (Hero, cores, mockups, ícones, seções, ordem)"
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