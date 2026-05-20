import { z } from "zod";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-2.5-flash";

function getKey() {
  const k = process.env.LOVABLE_API_KEY;
  if (!k) throw new Error("LOVABLE_API_KEY ausente — habilite Lovable Cloud.");
  return k;
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
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

async function callGateway(body: Record<string, unknown>): Promise<unknown> {
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

export type AiOpts = {
  systemPrompt?: string;
  maxTokens?: number;
  model?: string;
  temperature?: number;
};

export async function generateAIResponse(prompt: string, opts: AiOpts = {}): Promise<string> {
  const messages: Array<{ role: string; content: string }> = [];
  if (opts.systemPrompt) messages.push({ role: "system", content: opts.systemPrompt });
  messages.push({ role: "user", content: prompt });

  const res = await callGateway({
    model: opts.model ?? DEFAULT_MODEL,
    messages,
    ...(opts.maxTokens ? { max_tokens: opts.maxTokens } : {}),
    ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
  });

  const r = res as { choices?: Array<{ message?: { content?: string } }> };
  return r.choices?.[0]?.message?.content ?? "";
}

export async function generateAIJson<T = unknown>(
  prompt: string,
  opts: AiOpts = {},
): Promise<T> {
  const messages: Array<{ role: string; content: string }> = [];
  if (opts.systemPrompt) messages.push({ role: "system", content: opts.systemPrompt });
  messages.push({ role: "user", content: prompt });

  const res = await callGateway({
    model: opts.model ?? DEFAULT_MODEL,
    messages,
    response_format: { type: "json_object" },
    ...(opts.maxTokens ? { max_tokens: opts.maxTokens } : {}),
    ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
  });

  const r = res as { choices?: Array<{ message?: { content?: string } }> };
  const raw = r.choices?.[0]?.message?.content ?? "{}";
  return safeJSON(raw) as T;
}
