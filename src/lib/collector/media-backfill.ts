// Backfill único para as ofertas já mineradas ANTES desta mudança — tenta
// copiar a mídia a partir dos URLs já guardados em collected_ads
// (image_url/video_url), SEM chamar a Apify de novo (custo zero de créditos,
// só largura de banda nossa). Se o URL original ainda estiver vivo, copia
// agora, antes que expire também. Se já estiver morto, marca
// media_status='expired' — nunca promete recuperar o que já expirou.
//
// Deliberadamente NÃO é executado automaticamente por nada (nem cron, nem
// build, nem teste) — é uma ferramenta que alguém com acesso real ao
// Supabase chama manualmente (script ad-hoc ou botão administrativo), com
// autorização explícita, porque faz uma passada de rede contra as ofertas
// reais já guardadas.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { persistAdImage, persistAdVideo } from "@/lib/collector/media-persist";

export interface BackfillResult {
  scanned: number;
  imagesCopied: number;
  videosCopied: number;
  alreadyExpired: number;
}

export async function backfillAdMedia(limit = 50): Promise<BackfillResult> {
  const { data: rows } = await supabaseAdmin
    .from("collected_ads")
    .select("id, image_url, video_url, media_status")
    .in("media_status", ["not_attempted", "pending_video"])
    .order("last_seen_at", { ascending: false })
    .limit(limit);

  const result: BackfillResult = {
    scanned: 0,
    imagesCopied: 0,
    videosCopied: 0,
    alreadyExpired: 0,
  };

  for (const ad of (rows ?? []) as Array<{
    id: string;
    image_url: string | null;
    video_url: string | null;
    media_status: string;
  }>) {
    result.scanned++;
    let nextStatus = ad.media_status;
    let imagePath: string | null = null;
    let videoPath: string | null = null;

    if (ad.image_url && ad.media_status === "not_attempted") {
      const imgResult = await persistAdImage(ad.id, ad.image_url);
      imagePath = imgResult.imageStoragePath;
      nextStatus = imgResult.mediaStatus;
      if (imgResult.mediaStatus === "image_copied") result.imagesCopied++;
      else result.alreadyExpired++;
    }

    if (ad.video_url && (nextStatus === "image_copied" || ad.media_status === "pending_video")) {
      const vidResult = await persistAdVideo(ad.id, ad.video_url);
      videoPath = vidResult.videoStoragePath;
      nextStatus = vidResult.mediaStatus === "video_copied" ? "both_copied" : vidResult.mediaStatus;
      if (vidResult.mediaStatus === "video_copied") result.videosCopied++;
      else result.alreadyExpired++;
    }

    await supabaseAdmin
      .from("collected_ads")
      .update({
        ...(imagePath ? { image_storage_path: imagePath } : {}),
        ...(videoPath ? { video_storage_path: videoPath } : {}),
        media_status: nextStatus,
        media_captured_at: imagePath || videoPath ? new Date().toISOString() : undefined,
        media_source: imagePath || videoPath ? "scalaflow_copy" : undefined,
      } as never)
      .eq("id", ad.id);
  }

  return result;
}
