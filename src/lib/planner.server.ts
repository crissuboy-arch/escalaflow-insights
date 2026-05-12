import { z } from "zod";
import type { PlannerTemplate } from "./ebook/niches";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

function getKey() {
  const k = process.env.LOVABLE_API_KEY;
  if (!k) throw new Error("LOVABLE_API_KEY ausente — habilite Lovable Cloud.");
  return k;
}

async function aiChat(body: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`AI gateway ${res.status}: ${txt.slice(0, 160)}`);
  }
  return res.json();
}

export const PlannerContentSchema = z.object({
  template: z.string(),
  title: z.string(),
  motto: z.string(),
  intro: z.string(),
  trackers: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      items: z.array(z.string()),
    }),
  ),
  weeklyPrompts: z.array(z.string()).default([]),
});
export type PlannerContent = z.infer<typeof PlannerContentSchema>;

function safeParse(raw: unknown) {
  if (typeof raw !== "string") return raw ?? {};
  try {
    return JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m)
      try {
        return JSON.parse(m[0]);
      } catch {
        /* */
      }
    return {};
  }
}

export async function aiGeneratePlannerContent(
  template: PlannerTemplate,
  niche: string,
  identityName?: string,
): Promise<PlannerContent> {
  const data = (await aiChat({
    model: "google/gemini-3-flash-preview",
    messages: [
      {
        role: "system",
        content:
          "Você cria conteúdo de planners imprimíveis profissionais. Sempre responda via ferramenta `planner`.",
      },
      {
        role: "user",
        content: `Gere o conteúdo de um planner do tipo "${template}" para o nicho "${niche}"${identityName ? `, assinado por "${identityName}"` : ""}. Inclua: título, frase motivadora, introdução de 1 parágrafo, 3-5 trackers (cada um com nome, breve descrição e 5-8 itens preenchidos como exemplo) e 4 prompts de reflexão semanal.`,
      },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "planner",
          description: "Conteúdo de planner",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string" },
              motto: { type: "string" },
              intro: { type: "string" },
              trackers: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    description: { type: "string" },
                    items: { type: "array", items: { type: "string" } },
                  },
                  required: ["name", "description", "items"],
                  additionalProperties: false,
                },
              },
              weeklyPrompts: { type: "array", items: { type: "string" } },
            },
            required: ["title", "motto", "intro", "trackers", "weeklyPrompts"],
            additionalProperties: false,
          },
        },
      },
    ],
    tool_choice: { type: "function", function: { name: "planner" } },
  })) as any;
  const args =
    data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ??
    data?.choices?.[0]?.message?.content ??
    "{}";
  const parsed = safeParse(args) as Record<string, unknown>;
  return PlannerContentSchema.parse({ template, ...parsed });
}