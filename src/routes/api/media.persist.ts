// Recuperação do backlog de mídia da Biblioteca de Ofertas. Chamado pela
// própria Biblioteca (utilizador autenticado) em segundo plano, em lotes
// curtos, até a fila esvaziar — assim não dependemos do cron diário (plano
// Hobby da Vercel) e não pagamos nova coleta na Apify: só copia, para o
// Supabase Storage, os URLs que já estão guardados em collected_ads.
import { createFileRoute } from "@tanstack/react-router";
import { requireUserFromRequest } from "@/lib/auth/require-user-from-request";
import { drainMediaQueue, persistMediaForIds } from "@/lib/collector/media-pipeline";

export const Route = createFileRoute("/api/media/persist")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const user = await requireUserFromRequest(request);
        if (!user) {
          return Response.json({ ok: false, error: "Sessão inválida ou ausente" }, { status: 401 });
        }
        let body: { ids?: unknown } = {};
        try {
          body = (await request.json()) as { ids?: unknown };
        } catch {
          // corpo vazio = drenar a fila geral
        }
        try {
          if (Array.isArray(body.ids) && body.ids.length) {
            const ids = body.ids.filter((x): x is string => typeof x === "string").slice(0, 30);
            const summary = await persistMediaForIds(ids, { budgetMs: 8_000, includeVideo: true });
            return Response.json({ ok: true, ...summary, remaining: null });
          }
          const summary = await drainMediaQueue({ budgetMs: 8_000, batch: 18, includeVideo: true });
          return Response.json({ ok: true, ...summary });
        } catch (e) {
          return Response.json(
            { ok: false, error: e instanceof Error ? e.message : String(e) },
            { status: 500 },
          );
        }
      },
    },
  },
});
