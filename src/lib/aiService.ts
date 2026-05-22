import { z } from "zod";

function resolveProvider(): { url: string; key: string; model: string } {
  if (process.env.LOVABLE_API_KEY) {
    return {
      url: "https://ai.gateway.lovable.dev/v1/chat/completions",
      key: process.env.LOVABLE_API_KEY,
      model: "google/gemini-2.5-flash",
    };
  }
  if (process.env.OPENAI_API_KEY) {
    return {
      url: "https://api.openai.com/v1/chat/completions",
      key: process.env.OPENAI_API_KEY,
      model: "gpt-4o-mini",
    };
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return {
      url: "https://api.anthropic.com/v1/messages",
      key: process.env.ANTHROPIC_API_KEY,
      model: "claude-haiku-4-5-20251001",
    };
  }
  throw new Error(
    "Nenhuma chave de IA configurada. Adicione OPENAI_API_KEY, ANTHROPIC_API_KEY ou LOVABLE_API_KEY no arquivo .env",
  );
}

function getKey() {
  return resolveProvider().key;
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export function safeJSON(raw: unknown): unknown {
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

// Exported so server modules can resolve provider details for custom fetch logic.
export function resolveAIProvider() {
  return resolveProvider();
}

type OpenAITool = {
  type: string;
  function: { name: string; description?: string; parameters?: unknown };
};

// Normalize OpenAI tool_choice to Anthropic format
function toAnthropicToolChoice(tc: unknown): Record<string, unknown> | undefined {
  if (!tc) return undefined;
  if ((tc as Record<string, unknown>).type === "function") return { type: "auto" };
  if (typeof tc === "string" && tc === "required") return { type: "any" };
  return { type: "auto" };
}

export async function callGateway(body: Record<string, unknown>): Promise<unknown> {
  const provider = resolveProvider();
  const delays = [0, 1200, 3000];
  let lastErr: unknown;

  const isAnthropic = provider.url.includes("anthropic.com");

  for (let attempt = 0; attempt < delays.length; attempt++) {
    if (delays[attempt]) await sleep(delays[attempt]);

    let reqBody: Record<string, unknown>;
    let headers: Record<string, string>;

    if (isAnthropic) {
      // Convert OpenAI-style messages to Anthropic format
      const messages = (body.messages as Array<{ role: string; content: string }>) ?? [];
      const system = messages.find((m) => m.role === "system")?.content;
      const userMessages = messages
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role, content: m.content }));

      // Convert OpenAI tools → Anthropic tools
      const openAITools = body.tools as OpenAITool[] | undefined;
      const anthropicTools = openAITools?.map((t) => ({
        name: t.function.name,
        description: t.function.description ?? "",
        input_schema: t.function.parameters ?? { type: "object", properties: {} },
      }));

      reqBody = {
        model: body.model ?? provider.model,
        max_tokens: (body.max_tokens as number) ?? 4096,
        messages: userMessages,
        ...(system ? { system } : {}),
        ...(anthropicTools?.length
          ? {
              tools: anthropicTools,
              tool_choice: toAnthropicToolChoice(body.tool_choice) ?? { type: "auto" },
            }
          : {}),
      };
      headers = {
        "x-api-key": provider.key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      };
    } else {
      reqBody = { ...body, model: body.model ?? provider.model };
      headers = {
        Authorization: `Bearer ${provider.key}`,
        "Content-Type": "application/json",
      };
    }

    const res = await fetch(provider.url, {
      method: "POST",
      headers,
      body: JSON.stringify(reqBody),
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
        lastErr = new Error(`AI ${res.status}`);
        continue;
      }
      throw new Error(`AI ${res.status}: ${txt.slice(0, 200)}`);
    }

    const json = await res.json();

    // Normalize Anthropic response to OpenAI format
    if (isAnthropic) {
      type AnthropicBlock = { type?: string; text?: string; name?: string; input?: unknown };
      const content = (json as { content?: AnthropicBlock[] }).content ?? [];

      // Tool use response
      const toolBlock = content.find((c) => c.type === "tool_use");
      if (toolBlock) {
        return {
          choices: [{
            message: {
              tool_calls: [{
                function: {
                  name: toolBlock.name,
                  arguments: JSON.stringify(toolBlock.input ?? {}),
                },
              }],
            },
          }],
        };
      }

      // Regular text response
      const text = content.find((c) => c.type === "text")?.text ?? "";
      return { choices: [{ message: { content: text } }] };
    }

    return json;
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
  const provider = resolveProvider();
  const messages: Array<{ role: string; content: string }> = [];
  if (opts.systemPrompt) messages.push({ role: "system", content: opts.systemPrompt });
  messages.push({ role: "user", content: prompt });

  const res = await callGateway({
    model: opts.model ?? provider.model,
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
  const provider = resolveProvider();
  const isAnthropic = provider.url.includes("anthropic.com");
  const messages: Array<{ role: string; content: string }> = [];

  // For JSON output with Anthropic, append instruction to the system prompt
  const systemPrompt = isAnthropic
    ? (opts.systemPrompt ?? "") + "\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown, no explanation."
    : opts.systemPrompt;

  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: prompt });

  const res = await callGateway({
    model: opts.model ?? provider.model,
    messages,
    // json_object mode only supported by OpenAI/Lovable; Anthropic uses instruction instead
    ...(!isAnthropic ? { response_format: { type: "json_object" } } : {}),
    ...(opts.maxTokens ? { max_tokens: opts.maxTokens } : {}),
    ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
  });

  const r = res as { choices?: Array<{ message?: { content?: string } }> };
  const raw = r.choices?.[0]?.message?.content ?? "{}";
  return safeJSON(raw) as T;
}
