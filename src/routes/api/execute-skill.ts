import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { callGateway } from "@/lib/aiService";

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type",
};

function extractText(response: unknown): string {
  const r = response as Record<string, unknown>;
  if (Array.isArray(r.content)) {
    return (r.content as Array<{ type: string; text: string }>)
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("");
  }
  if (r.choices) {
    const choices = r.choices as Array<{ message: { content: string } }>;
    return choices[0]?.message?.content ?? "";
  }
  return "";
}

export const Route = createFileRoute("/api/execute-skill")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),

      GET: async ({ request }) => {
        const url = new URL(request.url);
        const moduleKey = url.searchParams.get("module_key") ?? "";
        if (!moduleKey) {
          return Response.json({ ok: false, error: "module_key obrigatório" }, { status: 400, headers: cors });
        }
        const { data: skill } = await supabaseAdmin
          .from("module_skills")
          .select("id, module_key, skill_id, skill_name, input_schema, output_schema, is_active")
          .eq("module_key", moduleKey)
          .eq("is_active", true)
          .maybeSingle();
        if (!skill) {
          return Response.json({ ok: false, skill: null }, { headers: cors });
        }
        return Response.json({ ok: true, skill }, { headers: cors });
      },

      POST: async ({ request }) => {
        let body: Record<string, unknown> = {};
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return Response.json({ ok: false, error: "JSON inválido" }, { status: 400, headers: cors });
        }

        const moduleKey = String(body.module_key ?? "").trim();
        const inputs = (body.inputs ?? {}) as Record<string, string>;

        if (!moduleKey) {
          return Response.json({ ok: false, error: "module_key obrigatório" }, { status: 400, headers: cors });
        }

        const { data: skill } = await supabaseAdmin
          .from("module_skills")
          .select("*")
          .eq("module_key", moduleKey)
          .eq("is_active", true)
          .maybeSingle();

        if (!skill) {
          return Response.json(
            { ok: false, error: "Nenhuma skill conectada a este módulo." },
            { status: 404, headers: cors },
          );
        }

        const inputLines = Object.entries(inputs)
          .filter(([, v]) => String(v ?? "").trim())
          .map(([k, v]) => `**${k}**: ${v}`)
          .join("\n");

        const userMessage = inputLines
          ? `Execute a skill com os seguintes parâmetros:\n\n${inputLines}`
          : "Execute a skill com configuração padrão.";

        try {
          const aiResponse = await callGateway({
            messages: [
              { role: "system", content: skill.skill_prompt },
              { role: "user", content: userMessage },
            ],
            max_tokens: 4096,
          });
          const text = extractText(aiResponse);
          return Response.json(
            { ok: true, result: text, skill_name: skill.skill_name },
            { headers: cors },
          );
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Erro ao executar skill";
          return Response.json({ ok: false, error: msg }, { status: 500, headers: cors });
        }
      },
    },
  },
});
