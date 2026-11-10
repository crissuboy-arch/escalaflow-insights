// Pipeline de mídia durável da Biblioteca de Ofertas (Minerar Ofertas).
//
// Problema que resolve: collected_ads.image_url/video_url apontam para o CDN
// temporário do Facebook/Apify. Esses links expiram em dias; o cron antigo
// copiava só 3 imagens + 1 vídeo por DIA, então quase tudo expirava antes de
// ser copiado e os cartões ficavam "sem mídia capturada".
//
// Garantias deste módulo:
//  • Deduplicação: o ficheiro é guardado por hash de conteúdo
//    (media/<sha256>.<ext>) — o mesmo criativo rodando em N anúncios ocupa
//    um único objeto no Storage, e uma nova coleta do mesmo anúncio não
//    gera nova cópia.
//  • Nunca apaga: um caminho já gravado (image_storage_path /
//    video_storage_path) nunca é sobrescrito com null nem removido.
//  • Recuperação de falhas: erro de rede / 5xx / 429 é transitório — o
//    anúncio volta para a fila (com backoff quando as colunas de retry da
//    migration 20261110000000 existem) até MAX_ATTEMPTS; 4xx = link morto
//    (expired), que só volta à fila se uma nova coleta trouxer um link novo.
//  • Orçamento de tempo: nunca começa um item novo depois de budgetMs, para
//    caber no limite de uma função serverless.
//
// Nunca inventa mídia: só copia bytes que o próprio link original devolveu,
// e valida que o content-type é mesmo imagem/vídeo.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  BUCKET,
  EXT_BY_CONTENT_TYPE,
  IMAGE_MAX_BYTES,
  IMAGE_TIMEOUT_MS,
  VIDEO_MAX_BYTES,
  VIDEO_TIMEOUT_MS,
  downloadCapped,
  type MediaStatus,
} from "@/lib/collector/media-persist";

export const MAX_ATTEMPTS = 4;
const RETRY_BACKOFF_MS = 10 * 60 * 1000;

export interface MediaRow {
  id: string;
  image_url: string | null;
  video_url: string | null;
  image_storage_path: string | null;
  video_storage_path: string | null;
  media_status: string | null;
  media_attempts?: number | null;
}

type CopyOutcome =
  | { kind: "copied"; path: string; deduped: boolean }
  | { kind: "dead"; detail: string }
  | { kind: "too_large"; detail: string }
  | { kind: "transient"; detail: string };

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes as unknown as ArrayBuffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function isTransientHttp(detail: string): boolean {
  const m = /HTTP (\d{3})/.exec(detail);
  if (!m) return false;
  const code = Number(m[1]);
  return code === 429 || code >= 500;
}

/** Baixa o URL e grava no bucket por hash de conteúdo. Exportado para teste. */
export async function copyToStorage(url: string, kind: "image" | "video"): Promise<CopyOutcome> {
  const res = await downloadCapped(
    url,
    kind === "image" ? IMAGE_TIMEOUT_MS : VIDEO_TIMEOUT_MS,
    kind === "image" ? IMAGE_MAX_BYTES : VIDEO_MAX_BYTES,
  );
  if (!res.ok) {
    if (res.reason === "too_large") return { kind: "too_large", detail: res.detail };
    if (res.reason === "network_error" || isTransientHttp(res.detail)) {
      return { kind: "transient", detail: res.detail };
    }
    return { kind: "dead", detail: res.detail };
  }
  // Um CDN que devolve uma página HTML de erro com 200 não é mídia.
  const ct = res.contentType.toLowerCase();
  const expectedPrefix = kind === "image" ? "image/" : "video/";
  const looksRight = ct.startsWith(expectedPrefix) || ct === "application/octet-stream";
  if (!looksRight || res.bytes.byteLength === 0) {
    return { kind: "dead", detail: `content-type inesperado: ${ct}` };
  }
  const contentType =
    ct === "application/octet-stream" ? (kind === "image" ? "image/jpeg" : "video/mp4") : ct;
  const ext = EXT_BY_CONTENT_TYPE[contentType] ?? (kind === "image" ? "jpg" : "mp4");
  const hash = await sha256Hex(res.bytes);
  const path = `media/${hash}.${ext}`;
  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, res.bytes, { contentType, upsert: false, cacheControl: "31536000" });
  if (error) {
    const msg = String((error as { message?: string }).message ?? error);
    const status = (error as { statusCode?: string | number }).statusCode;
    // Já existe = deduplicado (outro anúncio já guardou exatamente estes bytes).
    if (/exist|duplicate/i.test(msg) || String(status) === "409") {
      return { kind: "copied", path, deduped: true };
    }
    return { kind: "transient", detail: `upload: ${msg}` };
  }
  return { kind: "copied", path, deduped: false };
}

export interface ProcessResult {
  id: string;
  imageCopied: boolean;
  videoCopied: boolean;
  deduped: number;
  status: MediaStatus;
  error?: string;
}

/** Calcula o estado final a partir do que já existe + o que esta passada obteve. */
export function computeStatus(args: {
  hasImageUrl: boolean;
  hasVideoUrl: boolean;
  imagePath: string | null;
  videoPath: string | null;
  imageOutcome?: CopyOutcome["kind"];
  videoOutcome?: CopyOutcome["kind"];
  videoDeferred: boolean;
  attempts: number;
}): { status: MediaStatus; retry: boolean } {
  const { imagePath, videoPath } = args;
  const transient = args.imageOutcome === "transient" || args.videoOutcome === "transient";
  const canRetry = transient && args.attempts < MAX_ATTEMPTS;
  if (!args.hasImageUrl && !args.hasVideoUrl && !imagePath && !videoPath) {
    return { status: "no_media", retry: false };
  }
  const videoPending =
    args.hasVideoUrl &&
    !videoPath &&
    (args.videoDeferred || (args.videoOutcome === "transient" && canRetry));
  if (imagePath && videoPath) return { status: "both_copied", retry: false };
  if (imagePath && videoPending)
    return { status: "pending_video", retry: args.videoOutcome === "transient" };
  if (imagePath) return { status: "image_copied", retry: false };
  if (videoPath) return { status: "video_copied", retry: false };
  if (canRetry) return { status: "not_attempted", retry: true };
  if (args.imageOutcome === "too_large" || args.videoOutcome === "too_large") {
    return { status: "too_large_skipped", retry: false };
  }
  return { status: "expired", retry: false };
}

let retryColumnsSupported: boolean | null = null;
/** As colunas de retry vêm numa migration nova; o código funciona com ou sem elas. */
export async function hasRetryColumns(): Promise<boolean> {
  if (retryColumnsSupported !== null) return retryColumnsSupported;
  const { error } = await supabaseAdmin
    .from("collected_ads")
    .select("media_attempts, media_last_attempt_at, media_last_error")
    .limit(1);
  retryColumnsSupported = !error;
  return retryColumnsSupported;
}

export async function processAdMedia(
  row: MediaRow,
  opts: { includeVideo: boolean },
): Promise<ProcessResult> {
  const withRetry = await hasRetryColumns();
  let imagePath = row.image_storage_path;
  let videoPath = row.video_storage_path;
  let imageOutcome: CopyOutcome | undefined;
  let videoOutcome: CopyOutcome | undefined;
  let deduped = 0;

  if (row.image_url && !imagePath) {
    imageOutcome = await copyToStorage(row.image_url, "image");
    if (imageOutcome.kind === "copied") {
      imagePath = imageOutcome.path;
      if (imageOutcome.deduped) deduped++;
    }
  }
  const videoDeferred = Boolean(row.video_url && !videoPath && !opts.includeVideo);
  if (row.video_url && !videoPath && opts.includeVideo) {
    videoOutcome = await copyToStorage(row.video_url, "video");
    if (videoOutcome.kind === "copied") {
      videoPath = videoOutcome.path;
      if (videoOutcome.deduped) deduped++;
    }
  }

  // Sem as colunas de retry não há como contar tentativas nem fazer backoff;
  // nesse caso uma falha transitória é tratada como definitiva para não
  // travar a fila re-tentando sempre os mesmos anúncios.
  const attempts = withRetry ? (row.media_attempts ?? 0) + 1 : MAX_ATTEMPTS;
  const { status, retry } = computeStatus({
    hasImageUrl: Boolean(row.image_url),
    hasVideoUrl: Boolean(row.video_url),
    imagePath,
    videoPath,
    imageOutcome: imageOutcome?.kind,
    videoOutcome: videoOutcome?.kind,
    videoDeferred,
    attempts,
  });

  const errors = [imageOutcome, videoOutcome]
    .filter((o): o is Exclude<CopyOutcome, { kind: "copied" }> => !!o && o.kind !== "copied")
    .map((o) => `${o.kind}: ${o.detail}`);

  const now = new Date().toISOString();
  // Só escreve caminhos novos — nunca troca um caminho existente por null.
  const patch: Record<string, unknown> = { media_status: status };
  if (imagePath && imagePath !== row.image_storage_path) patch.image_storage_path = imagePath;
  if (videoPath && videoPath !== row.video_storage_path) patch.video_storage_path = videoPath;
  if (patch.image_storage_path || patch.video_storage_path) {
    patch.media_captured_at = now;
    patch.media_source = "scalaflow_copy";
  }
  if (withRetry) {
    patch.media_last_attempt_at = now;
    patch.media_attempts = retry ? attempts : 0;
    patch.media_last_error = errors.length ? errors.join(" | ").slice(0, 500) : null;
  }

  const { error } = await supabaseAdmin
    .from("collected_ads")
    .update(patch as never)
    .eq("id", row.id);

  return {
    id: row.id,
    imageCopied: Boolean(patch.image_storage_path),
    videoCopied: Boolean(patch.video_storage_path),
    deduped,
    status,
    error: error?.message ?? (errors.length ? errors.join(" | ") : undefined),
  };
}

const BASE_COLS = "id, image_url, video_url, image_storage_path, video_storage_path, media_status";

export interface DrainSummary {
  processed: number;
  imagesCopied: number;
  videosCopied: number;
  deduped: number;
  failed: number;
  remaining: number | null;
  elapsedMs: number;
}

async function runWithBudget(
  rows: MediaRow[],
  opts: { includeVideo: boolean; budgetMs: number; concurrency: number },
): Promise<Omit<DrainSummary, "remaining">> {
  const started = Date.now();
  const summary = {
    processed: 0,
    imagesCopied: 0,
    videosCopied: 0,
    deduped: 0,
    failed: 0,
    elapsedMs: 0,
  };
  let cursor = 0;
  const worker = async () => {
    while (cursor < rows.length && Date.now() - started < opts.budgetMs) {
      const row = rows[cursor++];
      try {
        const r = await processAdMedia(row, { includeVideo: opts.includeVideo });
        summary.processed++;
        if (r.imageCopied) summary.imagesCopied++;
        if (r.videoCopied) summary.videosCopied++;
        summary.deduped += r.deduped;
        if (!r.imageCopied && !r.videoCopied && r.error) summary.failed++;
      } catch (e) {
        summary.failed++;
        console.error("[media-pipeline] falha inesperada", row.id, e);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, opts.concurrency) }, worker));
  summary.elapsedMs = Date.now() - started;
  return summary;
}

/** Copia a mídia de anúncios específicos (logo após a coleta), só imagens. */
export async function persistMediaForIds(
  ids: string[],
  opts: { budgetMs?: number; includeVideo?: boolean } = {},
): Promise<Omit<DrainSummary, "remaining">> {
  if (!ids.length) {
    return { processed: 0, imagesCopied: 0, videosCopied: 0, deduped: 0, failed: 0, elapsedMs: 0 };
  }
  const withRetry = await hasRetryColumns();
  const { data, error } = await supabaseAdmin
    .from("collected_ads")
    .select(withRetry ? `${BASE_COLS}, media_attempts` : BASE_COLS)
    .in("id", ids);
  if (error) throw new Error(error.message);
  const rows = ((data ?? []) as unknown as MediaRow[]).filter(
    (r) => (r.image_url && !r.image_storage_path) || (r.video_url && !r.video_storage_path),
  );
  return runWithBudget(rows, {
    includeVideo: opts.includeVideo ?? false,
    budgetMs: opts.budgetMs ?? 9_000,
    concurrency: 4,
  });
}

/** Esvazia a fila pendente (backlog + vídeos), mais recentes primeiro. */
export async function drainMediaQueue(
  opts: { budgetMs?: number; batch?: number; includeVideo?: boolean } = {},
): Promise<DrainSummary> {
  const withRetry = await hasRetryColumns();
  let q = supabaseAdmin
    .from("collected_ads")
    .select(withRetry ? `${BASE_COLS}, media_attempts` : BASE_COLS)
    .in("media_status", ["not_attempted", "pending_video"])
    .order("last_seen_at", { ascending: false, nullsFirst: false })
    .limit(opts.batch ?? 24);
  if (withRetry) {
    const cutoff = new Date(Date.now() - RETRY_BACKOFF_MS).toISOString();
    q = q.or(`media_last_attempt_at.is.null,media_last_attempt_at.lt.${cutoff}`);
  }
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as MediaRow[];
  const summary = await runWithBudget(rows, {
    includeVideo: opts.includeVideo ?? true,
    budgetMs: opts.budgetMs ?? 9_000,
    concurrency: 3,
  });
  const { count } = await supabaseAdmin
    .from("collected_ads")
    .select("id", { count: "exact", head: true })
    .in("media_status", ["not_attempted", "pending_video"]);
  return { ...summary, remaining: count ?? null };
}
