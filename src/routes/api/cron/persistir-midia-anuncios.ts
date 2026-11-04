// Cron de mídia durável para collected_ads (ver src/lib/collector/
// media-persist.ts e a migration 20261104140000_collected_ads_media_persist.sql).
// Processa um lote pequeno por execução — imagens são rápidas (poucos
// segundos), vídeos podem chegar perto do timeout de 20s do helper, então
// processamos só 1 vídeo por execução pra caber com margem no timeout padrão
// de função serverless (10s no plano Hobby da Vercel, sem maxDuration
// configurado neste repositório — ajustar o batch/timeout se o plano
// permitir mais).
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { persistAdImage, persistAdVideo } from "@/lib/collector/media-persist";

const IMAGE_BATCH = 3;
const VIDEO_BATCH = 1;

export const Route = createFileRoute("/api/cron/persistir-midia-anuncios")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = process.env.CRON_SECRET;
        const auth = request.headers.get("authorization");
        if (!secret || auth !== `Bearer ${secret}`) {
          return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const { data: pendingImages } = await supabaseAdmin
          .from("collected_ads")
          .select("id, image_url, video_url")
          .eq("media_status", "not_attempted")
          .not("image_url", "is", null)
          .order("last_seen_at", { ascending: false })
          .limit(IMAGE_BATCH);

        let imagesProcessed = 0;
        for (const ad of (pendingImages ?? []) as Array<{
          id: string;
          image_url: string;
          video_url: string | null;
        }>) {
          const result = await persistAdImage(ad.id, ad.image_url);
          const nextStatus =
            result.mediaStatus === "image_copied" && ad.video_url
              ? "pending_video"
              : result.mediaStatus;
          await supabaseAdmin
            .from("collected_ads")
            .update({
              image_storage_path: result.imageStoragePath,
              media_status: nextStatus,
              media_captured_at: result.imageStoragePath ? new Date().toISOString() : null,
              media_source: "scalaflow_copy",
            } as never)
            .eq("id", ad.id);
          imagesProcessed++;
        }

        const { data: pendingVideos } = await supabaseAdmin
          .from("collected_ads")
          .select("id, video_url")
          .eq("media_status", "pending_video")
          .not("video_url", "is", null)
          .order("last_seen_at", { ascending: false })
          .limit(VIDEO_BATCH);

        let videosProcessed = 0;
        for (const ad of (pendingVideos ?? []) as Array<{ id: string; video_url: string }>) {
          const result = await persistAdVideo(ad.id, ad.video_url);
          await supabaseAdmin
            .from("collected_ads")
            .update({
              video_storage_path: result.videoStoragePath,
              media_status:
                result.mediaStatus === "video_copied" ? "both_copied" : result.mediaStatus,
              media_captured_at: result.videoStoragePath ? new Date().toISOString() : undefined,
            } as never)
            .eq("id", ad.id);
          videosProcessed++;
        }

        return Response.json({ ok: true, imagesProcessed, videosProcessed });
      },
    },
  },
});
