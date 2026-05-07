import { createFileRoute } from "@tanstack/react-router";
import { runCollector } from "@/lib/collector/collector.service";

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
};

export const Route = createFileRoute("/api/collector/run")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        let body: Record<string, unknown> = {};
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return Response.json({ ok: false, error: "JSON inválido" }, { status: 400, headers: cors });
        }
        const keyword = String(body.keyword ?? "").trim();
        if (!keyword) {
          return Response.json(
            { ok: false, error: "Palavra-chave obrigatória" },
            { status: 400, headers: cors },
          );
        }
        const result = await runCollector({
          keyword,
          country: body.country ? String(body.country) : undefined,
          niche: body.niche ? String(body.niche) : undefined,
          limit: typeof body.limit === "number" ? body.limit : Number(body.limit) || 20,
        });
        return Response.json(result, {
          status: result.ok ? 200 : 502,
          headers: cors,
        });
      },
    },
  },
});