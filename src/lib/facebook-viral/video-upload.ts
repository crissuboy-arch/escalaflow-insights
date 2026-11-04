// Browser-only video upload for the Viral Remix Studio (Fase 3). Runs
// entirely client-side on purpose — no FFmpeg, no server round-trip for
// the file bytes:
//  - duration/resolution: read from the <video> element's own metadata
//  - thumbnail: one <canvas> frame grab
//  - upload: goes straight from the browser to Supabase Storage using the
//    user's own session (bucket viral-media, RLS by path prefix = user id),
//    never through our own serverless function — a multi-MB video in a
//    server function's request body would hit Vercel's body-size limit.
import { supabase } from "@/integrations/supabase/client";

export const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/quicktime"]; // .mp4, .mov
export const MAX_VIDEO_BYTES = 200 * 1024 * 1024; // 200MB

export interface VideoValidationError {
  ok: false;
  error: string;
}

export interface ExtractedVideoMetadata {
  ok: true;
  durationSeconds: number;
  width: number;
  height: number;
  thumbnailBlob: Blob;
}

function validateFile(file: File): VideoValidationError | null {
  if (!ACCEPTED_VIDEO_TYPES.includes(file.type)) {
    return { ok: false, error: "Formato não suportado — envia um ficheiro .mp4 ou .mov." };
  }
  if (file.size > MAX_VIDEO_BYTES) {
    return {
      ok: false,
      error: `Ficheiro grande demais (máx. ${MAX_VIDEO_BYTES / 1024 / 1024}MB).`,
    };
  }
  return null;
}

/** Loads the file into an off-DOM <video>, reads its real metadata, and
 *  grabs one frame as a JPEG thumbnail. Never fabricates a value — if the
 *  browser can't decode the file, this rejects instead of guessing. */
export function extractVideoMetadata(
  file: File,
): Promise<ExtractedVideoMetadata | VideoValidationError> {
  const invalid = validateFile(file);
  if (invalid) return Promise.resolve(invalid);

  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.src = url;

    const cleanup = () => URL.revokeObjectURL(url);

    video.onloadedmetadata = () => {
      const duration = video.duration;
      const width = video.videoWidth;
      const height = video.videoHeight;
      if (!Number.isFinite(duration) || width === 0 || height === 0) {
        cleanup();
        resolve({ ok: false, error: "Não foi possível ler os metadados do vídeo." });
        return;
      }
      // Seek to a representative frame before grabbing the thumbnail.
      video.currentTime = Math.min(duration * 0.1, duration);
    };

    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        cleanup();
        resolve({ ok: false, error: "Não foi possível gerar a miniatura." });
        return;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          cleanup();
          if (!blob) {
            resolve({ ok: false, error: "Não foi possível gerar a miniatura." });
            return;
          }
          resolve({
            ok: true,
            durationSeconds: video.duration,
            width: video.videoWidth,
            height: video.videoHeight,
            thumbnailBlob: blob,
          });
        },
        "image/jpeg",
        0.8,
      );
    };

    video.onerror = () => {
      cleanup();
      resolve({ ok: false, error: "O navegador não conseguiu abrir este ficheiro de vídeo." });
    };
  });
}

export interface UploadedVideoFiles {
  ok: true;
  storagePath: string;
  thumbnailPath: string;
}

/** Uploads the video file and its thumbnail directly to the private
 *  viral-media bucket, under "<userId>/..." so the RLS path-prefix policy
 *  grants access only to its owner. */
export async function uploadVideoToStorage(
  userId: string,
  file: File,
  thumbnailBlob: Blob,
): Promise<UploadedVideoFiles | VideoValidationError> {
  const ext = file.name.toLowerCase().endsWith(".mov") ? "mov" : "mp4";
  const id = crypto.randomUUID();
  const storagePath = `${userId}/videos/${id}.${ext}`;
  const thumbnailPath = `${userId}/thumbnails/${id}.jpg`;

  const { error: videoError } = await supabase.storage
    .from("viral-media")
    .upload(storagePath, file, { contentType: file.type, upsert: false });
  if (videoError) return { ok: false, error: `Falha no upload do vídeo: ${videoError.message}` };

  const { error: thumbError } = await supabase.storage
    .from("viral-media")
    .upload(thumbnailPath, thumbnailBlob, { contentType: "image/jpeg", upsert: false });
  if (thumbError) {
    // Thumbnail is non-essential; keep the uploaded video and report but don't fail the whole flow.
    console.error("[facebook-viral] thumbnail upload failed:", thumbError.message);
    return { ok: true, storagePath, thumbnailPath: "" };
  }

  return { ok: true, storagePath, thumbnailPath };
}

/** Signed URL for playback/preview of a private video/thumbnail path.
 *  Short-lived on purpose — regenerate per view rather than caching long-term. */
export async function getViralMediaSignedUrl(
  path: string,
  expiresInSeconds = 3600,
): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from("viral-media")
    .createSignedUrl(path, expiresInSeconds);
  if (error || !data) {
    console.error("[facebook-viral] createSignedUrl failed:", error?.message);
    return null;
  }
  return data.signedUrl;
}
