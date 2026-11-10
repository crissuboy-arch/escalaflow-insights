// Cópia durável da mídia de anúncios minerados para o bucket público
// "mining-media" (criado em 20260520100000_complete_persistence.sql, nunca
// usado até agora). Resolve o problema de collected_ads.image_url/video_url
// guardarem o link temporário do CDN da Apify/Facebook — uma vez expirado,
// a imagem/vídeo some (ver comentário datado em
// src/routes/_authenticated/minerar.tsx sobre "URL signature expired").
//
// Nunca lança para o chamador: falha de rede/SSRF/tamanho vira um
// media_status, não derruba o upsert do anúncio. Usa sempre supabaseAdmin —
// collected_ads é sempre escrito com service role (ver persist.ts), então o
// Storage também é, sem fricção de RLS.
//
// Importante (ver o relatório/plano): isto só copia a mesma mídia que o
// ScalaFlow já raspa e exibe hoje — não é uma nova categoria de risco em
// relação ao que o Minerar Ofertas já faz. Não há download/redistribuição de
// nada que o utilizador não já estivesse a ver na app.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { resolvesToPrivateIp } from "@/lib/net/ssrf-guard";

const BUCKET = "mining-media";
const IMAGE_MAX_BYTES = 8 * 1024 * 1024; // 8MB
const VIDEO_MAX_BYTES = 25 * 1024 * 1024; // 25MB
const IMAGE_TIMEOUT_MS = 8_000;
const VIDEO_TIMEOUT_MS = 20_000;
const MAX_REDIRECTS = 3;

export type MediaStatus =
  | "not_attempted"
  | "pending_video"
  | "image_copied"
  | "video_copied"
  | "both_copied"
  | "expired"
  | "too_large_skipped"
  | "no_media";

const EXT_BY_CONTENT_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

/** Resolves and re-resolves (per redirect hop) before every fetch — a
 *  one-time check before following redirects is not enough (see
 *  src/lib/net/ssrf-guard.ts). These URLs come from Apify/Facebook's own CDN
 *  in practice, but a corrupted/unexpected dataset item is still guarded. */
async function guardedFetch(rawUrl: string, timeoutMs: number): Promise<Response> {
  let currentUrl = rawUrl;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const u = new URL(currentUrl);
      if (await resolvesToPrivateIp(u.hostname)) {
        throw new Error(`Bloqueado pelo SSRF guard: ${u.hostname}`);
      }
      const res = await fetch(currentUrl, { redirect: "manual", signal: controller.signal });
      const location = res.headers.get("location");
      if (res.status >= 300 && res.status < 400 && location) {
        currentUrl = new URL(location, currentUrl).toString();
        continue;
      }
      return res;
    }
    throw new Error("Demasiados redirecionamentos.");
  } finally {
    clearTimeout(timer);
  }
}

interface DownloadResult {
  ok: true;
  bytes: Uint8Array;
  contentType: string;
}
interface DownloadFailure {
  ok: false;
  reason: "expired" | "too_large" | "network_error";
  detail: string;
}

async function downloadCapped(
  url: string,
  timeoutMs: number,
  maxBytes: number,
): Promise<DownloadResult | DownloadFailure> {
  try {
    const res = await guardedFetch(url, timeoutMs);
    if (!res.ok) {
      return { ok: false, reason: "expired", detail: `HTTP ${res.status}` };
    }
    const contentLength = res.headers.get("content-length");
    if (contentLength && Number(contentLength) > maxBytes) {
      return { ok: false, reason: "too_large", detail: `content-length=${contentLength}` };
    }
    const buf = await res.arrayBuffer();
    if (buf.byteLength > maxBytes) {
      return { ok: false, reason: "too_large", detail: `downloaded=${buf.byteLength}` };
    }
    const contentType =
      res.headers.get("content-type")?.split(";")[0]?.trim() || "application/octet-stream";
    return { ok: true, bytes: new Uint8Array(buf), contentType };
  } catch (e) {
    return {
      ok: false,
      reason: "network_error",
      detail: e instanceof Error ? e.message : String(e),
    };
  }
}

export interface PersistImageResult {
  mediaStatus: Extract<MediaStatus, "image_copied" | "expired" | "too_large_skipped">;
  imageStoragePath: string | null;
}

/** Called synchronously right after an ad is upserted — images are small
 *  enough to copy inline without risking the serverless function's timeout. */
export async function persistAdImage(adId: string, imageUrl: string): Promise<PersistImageResult> {
  const result = await downloadCapped(imageUrl, IMAGE_TIMEOUT_MS, IMAGE_MAX_BYTES);
  if (!result.ok) {
    console.warn(
      `[media-persist] imagem não copiada (ad=${adId}): ${result.reason} — ${result.detail}`,
    );
    return {
      mediaStatus: result.reason === "too_large" ? "too_large_skipped" : "expired",
      imageStoragePath: null,
    };
  }

  const ext = EXT_BY_CONTENT_TYPE[result.contentType] ?? "jpg";
  const path = `ads/${adId}/image.${ext}`;
  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, result.bytes, { contentType: result.contentType, upsert: true });
  if (error) {
    console.warn(`[media-persist] falha no upload da imagem (ad=${adId}): ${error.message}`);
    return { mediaStatus: "expired", imageStoragePath: null };
  }
  return { mediaStatus: "image_copied", imageStoragePath: path };
}

export interface PersistVideoResult {
  mediaStatus: Extract<MediaStatus, "video_copied" | "expired" | "too_large_skipped">;
  videoStoragePath: string | null;
}

/** Só chamado pelo cron de background (src/routes/api/cron/
 *  persistir-midia-anuncios.ts) — nunca inline no upsert, um vídeo pode ser
 *  grande/lento demais pro timeout de uma função serverless comum. */
export async function persistAdVideo(adId: string, videoUrl: string): Promise<PersistVideoResult> {
  const result = await downloadCapped(videoUrl, VIDEO_TIMEOUT_MS, VIDEO_MAX_BYTES);
  if (!result.ok) {
    console.warn(
      `[media-persist] vídeo não copiado (ad=${adId}): ${result.reason} — ${result.detail}`,
    );
    return {
      mediaStatus: result.reason === "too_large" ? "too_large_skipped" : "expired",
      videoStoragePath: null,
    };
  }

  const ext = EXT_BY_CONTENT_TYPE[result.contentType] ?? "mp4";
  const path = `ads/${adId}/video.${ext}`;
  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, result.bytes, { contentType: result.contentType, upsert: true });
  if (error) {
    console.warn(`[media-persist] falha no upload do vídeo (ad=${adId}): ${error.message}`);
    return { mediaStatus: "expired", videoStoragePath: null };
  }
  return { mediaStatus: "video_copied", videoStoragePath: path };
}

/** Caminho público e estável (bucket "mining-media" é público, sem expiry —
 *  ao contrário do bucket privado "viral-media", que usa signed URLs). */
export function getMiningMediaPublicUrl(path: string): string {
  return supabaseAdmin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
