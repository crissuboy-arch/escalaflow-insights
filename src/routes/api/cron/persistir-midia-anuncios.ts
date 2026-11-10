// Cron de mídia durável para collected_ads (ver src/lib/collector/
// media-persist.ts e a migration 20261104140000_collected_ads_media_persist.sql).
// Agendado 1x/dia em vercel.json — o plano Hobby da Vercel só permite cron
// diário (um agendamento de hora em hora quebrou o deploy: "Hobby accounts
// are limited to daily cron jobs"). Processa um lote pequeno por execução —
// imagens são rápidas (poucos segundos), vídeos podem chegar perto do
// timeout de 20s do helper, então processamos só 1 vídeo por execução pra
// caber com margem no timeout padrão de função serverless (sem maxDuration
// configurado neste repositório). Isto é deliberadamente lento para o
// backlog de anúncios antigos — para esses, ver
// src/lib/collector/media-backfill.ts (execução manual, mais itens de uma vez).
import { createFileRoute } from "@tanstack/react-router";
import { drainMediaQueue } from "@/lib/collector/media-pipeline";


export const Route = createFileRoute("/api/cron/persistir-midia-anuncios")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = process.env.CRON_SECRET;
        const auth = request.headers.get("authorization");
        if (!secret || auth !== `Bearer ${secret}`) {
          return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        // Mesmo pipeline da Biblioteca (dedupe por hash, nunca apaga, retry).
        const summary = await drainMediaQueue({ budgetMs: 8_000, batch: 24, includeVideo: true });
        return Response.json({ ok: true, ...summary });
      },
    },
  },
});
