import { z } from "zod";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

function getKey() {
  const k = process.env.LOVABLE_API_KEY;
  if (!k) throw new Error("LOVABLE_API_KEY ausente — habilite Lovable Cloud.");
  return k;
}

function safeJSON(raw: unknown): unknown {
  if (typeof raw !== "string") return raw ?? {};
  try {
    return JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) {
      try { return JSON.parse(m[0]); } catch { return {}; }
    }
    return {};
  }
}

export const ScaleAnalysisSchema = z.object({
  diagnosis: z.string().default(""),
  winningCreative: z.string().default(""),
  winningAngle: z.string().default(""),
  fatigue: z.string().default(""),
  scaleRecommendation: z.enum(["escalar", "manter", "otimizar", "cortar"]).default("manter"),
  scaleNotes: z.string().default(""),
  metrics: z.object({
    ctr: z.string().default(""),
    cpc: z.string().default(""),
    cpm: z.string().default(""),
    roas: z.string().default(""),
    frequencia: z.string().default(""),
  }).default({}),
  nextTests: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
});
export type ScaleAnalysis = z.infer<typeof ScaleAnalysisSchema>;

export type ScaleContext = {
  productName?: string;
  niche?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
  roas?: string;
  frequencia?: string;
  spend?: string;
  daysRunning?: string;
  notes?: string;
  imageDataUrl?: string; // optional screenshot (base64 data URL)
};

const SYSTEM = `Você é um media buyer sênior especialista em Facebook/Instagram Ads para infoprodutos. Lê métricas e screenshots do gerenciador de anúncios e devolve diagnóstico claro em PT-BR. Sempre responde JSON válido conforme o schema, sem markdown.`;

export async function aiAnalyzeScale(ctx: ScaleContext): Promise<ScaleAnalysis> {
  const key = getKey();

  const textPrompt = `Analise a performance abaixo e devolva APENAS este JSON:
{
  "diagnosis": "<resumo do que está acontecendo>",
  "winningCreative": "<qual criativo está vencendo e por quê>",
  "winningAngle": "<ângulo de copy vencedor>",
  "fatigue": "<sinais de fadiga: frequência, queda de CTR etc>",
  "scaleRecommendation": "escalar | manter | otimizar | cortar",
  "scaleNotes": "<como executar a recomendação: 2x budget, duplicar, mudar criativo, pausar...>",
  "metrics": { "ctr": "...", "cpc": "...", "cpm": "...", "roas": "...", "frequencia": "..." },
  "nextTests": ["<teste 1>", "<teste 2>", "<teste 3>"],
  "warnings": ["<alertas: orçamento baixo, sem dados suficientes, etc>"]
}

CONTEXTO:
Produto: ${ctx.productName || "—"}
Nicho: ${ctx.niche || "—"}
CTR: ${ctx.ctr || "—"}
CPC: ${ctx.cpc || "—"}
CPM: ${ctx.cpm || "—"}
ROAS: ${ctx.roas || "—"}
Frequência: ${ctx.frequencia || "—"}
Gasto: ${ctx.spend || "—"}
Dias rodando: ${ctx.daysRunning || "—"}
Notas / resultados colados: ${ctx.notes || "—"}

Se houver screenshot anexado, use-o como fonte primária e extraia métricas reais dele.`;

  const userContent: Array<Record<string, unknown>> = [{ type: "text", text: textPrompt }];
  if (ctx.imageDataUrl) {
    userContent.push({ type: "image_url", image_url: { url: ctx.imageDataUrl } });
  }

  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userContent },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (res.status === 429) throw new Error("Limite de IA atingido. Aguarde alguns segundos.");
  if (res.status === 402) throw new Error("Créditos da IA esgotados.");
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`AI gateway ${res.status}: ${t.slice(0, 200)}`);
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = json.choices?.[0]?.message?.content ?? "{}";
  const parsed = safeJSON(content);
  return ScaleAnalysisSchema.parse(parsed);
}