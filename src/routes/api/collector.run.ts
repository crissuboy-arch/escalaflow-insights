import { createFileRoute } from "@tanstack/react-router";
import { runCollector } from "@/lib/collector/collector.service";
import { upsertCollectedAd, summarizePersistResults, type PersistResult } from "@/lib/collector/persist";

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
          platform: body.platform ? String(body.platform) : undefined,
        });

        // Persist real ads to Supabase — same shared upsert path as the
        // extension's /api/ingest, so first_seen_at/last_seen_at longevity
        // tracking and offer-network detection are consistent everywhere.
        const persistResults: PersistResult[] = [];
        if (result.ok && result.ads.length) {
          for (const a of result.ads) {
            try {
              const r = await upsertCollectedAd({
                advertiser: a.advertiser,
                headline: a.headline,
                copy: a.copy,
                cta: a.cta,
                imageUrl: a.imageUrl,
                videoUrl: a.videoUrl,
                creativeType: a.videoUrl ? "video" : a.imageUrl ? "image" : null,
                platform: a.platform,
                country: a.country,
                niche: a.niche,
                keyword,
                score: a.score,
                adUrl: a.adUrl,
                adLibraryId: a.adLibraryId,
                landingPageUrl: a.landingPageUrl,
                startDate: a.startDate,
                source: "collector",
                raw: {
                  ...(a.raw && typeof a.raw === "object" ? (a.raw as Record<string, unknown>) : { original: a.raw ?? null }),
                  enriched: {
                    tags: a.tags ?? [],
                    subniche: a.subniche ?? null,
                    promise: a.promise ?? null,
                    mechanism: a.mechanism ?? null,
                    emotion: a.emotion ?? null,
                    scaleLevel: a.scaleLevel ?? null,
                    isVsl: a.isVsl ?? false,
                    vslScaling: a.vslScaling ?? false,
                    hookRepeated: a.hookRepeated ?? false,
                    viralStructure: a.viralStructure ?? false,
                    copyPattern: a.copyPattern ?? false,
                    hookText: a.hookText ?? null,
                  },
                },
              });
              if (r.error) console.error("[collector] persist error:", r.error);
              persistResults.push(r);
            } catch (e) {
              console.error("[collector] persist failed:", e);
              persistResults.push({ inserted: false, updated: false, error: e instanceof Error ? e.message : String(e) });
            }
          }
        }

        const { saved, failed, firstError } = summarizePersistResults(persistResults);
        if (failed > 0) {
          console.error(`[collector] ${failed}/${persistResults.length} ads returned to the UI were NOT persisted — they will not survive a reload. First error: ${firstError}`);
        }

        return Response.json(
          { ...result, saved, persistFailed: failed, persistError: failed > 0 ? firstError : undefined },
          { status: result.ok ? 200 : 502, headers: cors },
        );
      },
    },
  },
});