import { createFileRoute } from "@tanstack/react-router";
import { runCollector } from "@/lib/collector/collector.service";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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

        // Persist real ads to Supabase (upsert by ad_library_id)
        let saved = 0;
        if (result.ok && result.ads.length) {
          try {
            const rows = result.ads.map((a) => ({
              ad_library_id: a.adLibraryId ?? null,
              ad_url: a.adUrl ?? null,
              advertiser: a.advertiser,
              headline: a.headline,
              copy: a.copy,
              cta: a.cta ?? null,
              image_url: a.imageUrl ?? null,
              video_url: a.videoUrl ?? null,
              creative_type: a.videoUrl ? "video" : a.imageUrl ? "image" : null,
              platform: a.platform,
              country: a.country,
              niche: a.niche,
              keyword,
              score: a.score,
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
              } as never,
            }));
            const withId = rows.filter((r) => r.ad_library_id);
            const withoutId = rows.filter((r) => !r.ad_library_id);
            if (withId.length) {
              const { error, count } = await supabaseAdmin
                .from("collected_ads")
                .upsert(withId, { onConflict: "ad_library_id", count: "exact" });
              if (error) console.error("[collector] upsert error:", error.message);
              else saved += count ?? withId.length;
            }
            if (withoutId.length) {
              const { error, count } = await supabaseAdmin
                .from("collected_ads")
                .insert(withoutId, { count: "exact" });
              if (error) console.error("[collector] insert error:", error.message);
              else saved += count ?? withoutId.length;
            }
          } catch (e) {
            console.error("[collector] persistence failed:", e);
          }
        }

        return Response.json(
          { ...result, saved },
          { status: result.ok ? 200 : 502, headers: cors },
        );
      },
    },
  },
});