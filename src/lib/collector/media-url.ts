// Client-safe helper: resolve a cópia durável (bucket público "mining-media")
// quando existir, senão cai no URL original (temporário, pode já ter
// expirado — ver src/lib/collector/media-persist.ts). Usa o cliente do
// browser (chave pública), não o admin — getPublicUrl não faz chamada de
// rede nem precisa de autenticação, só monta a URL do bucket público.
import { supabase } from "@/integrations/supabase/client";

export const MINING_MEDIA_BUCKET = "mining-media";

function publicMediaUrl(path: string): string {
  return supabase.storage.from(MINING_MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Estados em que o pipeline JÁ confirmou que o link original morreu (ou
 *  nunca houve mídia): mostrar esse link só daria uma imagem partida. */
const DEAD_ORIGINAL_STATUSES = new Set(["expired", "no_media"]);

/**
 * Regra única de preferência de mídia (pura, testável):
 *  1. caminho no Storage → URL público permanente (sempre preferido);
 *  2. senão, o URL original do CDN — só se o pipeline não o marcou como morto;
 *  3. senão null → a UI mostra um placeholder limpo + link do anúncio.
 */
export function pickMediaUrl(
  args: { storagePath?: string | null; originalUrl?: string | null; mediaStatus?: string | null },
  toPublicUrl: (path: string) => string = publicMediaUrl,
): string | null {
  const path = args.storagePath?.trim();
  if (path) return toPublicUrl(path);
  if (args.mediaStatus && DEAD_ORIGINAL_STATUSES.has(args.mediaStatus)) return null;
  const url = args.originalUrl?.trim();
  return url && /^https?:\/\//i.test(url) ? url : null;
}

export function resolveAdImageUrl(ad: {
  image_storage_path?: string | null;
  image_url: string | null;
  media_status?: string | null;
}): string | null {
  return pickMediaUrl({
    storagePath: ad.image_storage_path,
    originalUrl: ad.image_url,
    mediaStatus: ad.media_status,
  });
}

export function resolveAdVideoUrl(ad: {
  video_storage_path?: string | null;
  video_url: string | null;
  media_status?: string | null;
}): string | null {
  return pickMediaUrl({
    storagePath: ad.video_storage_path,
    originalUrl: ad.video_url,
    mediaStatus: ad.media_status,
  });
}
