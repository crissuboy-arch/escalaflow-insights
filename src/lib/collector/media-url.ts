// Client-safe helper: resolve a cópia durável (bucket público "mining-media")
// quando existir, senão cai no URL original (temporário, pode já ter
// expirado — ver src/lib/collector/media-persist.ts). Usa o cliente do
// browser (chave pública), não o admin — getPublicUrl não faz chamada de
// rede nem precisa de autenticação, só monta a URL do bucket público.
import { supabase } from "@/integrations/supabase/client";

function publicMediaUrl(path: string): string {
  return supabase.storage.from("mining-media").getPublicUrl(path).data.publicUrl;
}

export function resolveAdImageUrl(ad: {
  image_storage_path?: string | null;
  image_url: string | null;
}): string | null {
  if (ad.image_storage_path) return publicMediaUrl(ad.image_storage_path);
  return ad.image_url;
}

export function resolveAdVideoUrl(ad: {
  video_storage_path?: string | null;
  video_url: string | null;
}): string | null {
  if (ad.video_storage_path) return publicMediaUrl(ad.video_storage_path);
  return ad.video_url;
}
