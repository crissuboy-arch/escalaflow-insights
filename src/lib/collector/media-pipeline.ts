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
/** Tempo extra depois do orçamento para um download já iniciado terminar e gravar. */
const VIDEO_GRACE_MS = 1_500;
const RETRY_BACKOFF_MS = 10 * 60 * 1000;

export interface MediaRow {
  id: string;
  image_url: string | null;
  video_url: string | null;
  image_storage_path: string | null;
  video_storage_path: string | null;
  media_status: string | null;
  media_attempts?: number | null;
  /** raw->snapshot->videos->0->>video_sd_url, quando existir. */
  video_sd_url?: string | null;
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

const GENERIC_BINARY = new Set(["application/octet-stream", "binary/octet-stream"]);

/** Baixa o URL e grava no bucket por hash de conteúdo. Exportado para teste.
 *  `timeoutMs` permite encurtar o download para caber no orçamento restante. */
export async function copyToStorage(
  url: string,
  kind: "image" | "video",
  timeoutMs?: number,
): Promise<CopyOutcome> {
  const res = await downloadCapped(
    url,
    timeoutMs ?? (kind === "image" ? IMAGE_TIMEOUT_MS : VIDEO_TIMEOUT_MS),
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
  const looksRight = ct.startsWith(expectedPrefix) || GENERIC_BINARY.has(ct);
  if (!looksRight || res.bytes.byteLength === 0) {
    return { kind: "dead", detail: `content-type inesperado: ${ct}` };
  }
  const contentType = GENERIC_BINARY.has(ct) ? (kind === "image" ? "image/jpeg" : "video/mp4") : ct;
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
    // Limite de tamanho do bucket/plano: re-tentar não adianta.
    if (/too large|payload|maximum allowed size|exceeded/i.test(msg) || String(status) === "413") {
      return { kind: "too_large", detail: `upload: ${msg}` };
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
  try {
    const { error } = await supabaseAdmin
      .from("collected_ads")
      .select("media_attempts, media_last_attempt_at, media_last_error")
      .limit(1);
    retryColumnsSupported = !error;
    return retryColumnsSupported;
  } catch {
    // Falha inesperada (rede/mock): não guarda em cache, assume sem colunas.
    return false;
  }
}

/** Tempo mínimo para valer a pena começar o download de um vídeo. */
const MIN_VIDEO_WINDOW_MS = 3_000;

export async function processAdMedia(
  row: MediaRow,
  opts: {
    includeVideo: boolean;
    /** Instante (Date.now()) até ao qual o vídeo pode descarregar. Sem ele, usa VIDEO_TIMEOUT_MS. */
    deadline?: number;
  },
): Promise<ProcessResult> {
  const withRetry = await hasRetryColumns();
  let imagePath = row.image_storage_path;
  let videoPath = row.video_storage_path;
  let imageOutcome: CopyOutcome | undefined;
  let videoOutcome: CopyOutcome | undefined;
  let deduped = 0;

  // Sem as colunas de retry não há como contar tentativas nem fazer backoff;
  // nesse caso uma falha transitória é tratada como definitiva para não
  // travar a fila re-tentando sempre os mesmos anúncios.
  const attempts = withRetry ? (row.media_attempts ?? 0) + 1 : MAX_ATTEMPTS;
  // Sem tempo para um vídeo nesta passada → fica para a próxima, sem gastar tentativa.
  const videoWindowOk =
    !opts.deadline || opts.deadline - Date.now() >= MIN_VIDEO_WINDOW_MS + IMAGE_TIMEOUT_MS / 4;
  // Limite duro: depois de MAX_ATTEMPTS tentativas (incluindo as que morreram
  // a meio por timeout da função) desiste do vídeo — a imagem fica, e a linha
  // sai de pending_video em vez de ocupar a fila para sempre.
  const videoExhausted =
    withRetry && Boolean(row.video_url && !videoPath) && (row.media_attempts ?? 0) >= MAX_ATTEMPTS;
  const wantsVideo = Boolean(
    row.video_url && !videoPath && opts.includeVideo && videoWindowOk && !videoExhausted,
  );

  // "Reserva" a linha ANTES de descarregar: se a função for morta a meio de um
  // vídeo grande, a tentativa já fica contada e com backoff — antes o mesmo
  // punhado de vídeos voltava sempre ao topo da fila (ordem last_seen_at) e
  // bloqueava todos os outros, que ficavam em pending_video para sempre.
  if (withRetry && wantsVideo) {
    await supabaseAdmin
      .from("collected_ads")
      .update({
        media_attempts: attempts,
        media_last_attempt_at: new Date().toISOString(),
      } as never)
      .eq("id", row.id);
  }

  if (row.image_url && !imagePath) {
    imageOutcome = await copyToStorage(row.image_url, "image");
    if (imageOutcome.kind === "copied") {
      imagePath = imageOutcome.path;
      if (imageOutcome.deduped) deduped++;
    }
  }
  let videoDeferred = Boolean(row.video_url && !videoPath && !wantsVideo && !videoExhausted);
  if (videoExhausted) {
    videoOutcome = { kind: "dead", detail: `vídeo desistido após ${MAX_ATTEMPTS} tentativas` };
  }
  if (wantsVideo && row.video_url) {
    const window = opts.deadline ? opts.deadline - Date.now() : VIDEO_TIMEOUT_MS;
    if (window < MIN_VIDEO_WINDOW_MS) {
      // Sem tempo para um vídeo nesta passada: fica para a próxima, sem gastar tentativa.
      videoDeferred = true;
    } else {
      const timeout = Math.min(VIDEO_TIMEOUT_MS, window);
      videoOutcome = await copyToStorage(row.video_url, "video", timeout);
      // HD grande demais/expirado → tenta a versão SD do mesmo criativo.
      const sd = row.video_sd_url;
      if (
        videoOutcome.kind !== "copied" &&
        videoOutcome.kind !== "transient" &&
        sd &&
        sd !== row.video_url
      ) {
        const left = opts.deadline ? opts.deadline - Date.now() : VIDEO_TIMEOUT_MS;
        if (left >= MIN_VIDEO_WINDOW_MS) {
          const sdOutcome = await copyToStorage(sd, "video", Math.min(VIDEO_TIMEOUT_MS, left));
          if (sdOutcome.kind === "copied" || sdOutcome.kind === "transient") {
            videoOutcome = sdOutcome;
          }
        }
      }
      if (videoOutcome.kind === "copied") {
        videoPath = videoOutcome.path;
        if (videoOutcome.deduped) deduped++;
      }
    }
  }
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

const BASE_COLS =
  "id, image_url, video_url, image_storage_path, video_storage_path, media_status, " +
  // Versão SD do mesmo vídeo (menor) — fallback quando o HD é grande demais.
  "video_sd_url:raw->snapshot->videos->0->>video_sd_url";

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
  // Margem para gravar o resultado (update + upload) antes do fim do orçamento.
  const deadline = started + opts.budgetMs + VIDEO_GRACE_MS;
  const worker = async () => {
    while (cursor < rows.length && Date.now() - started < opts.budgetMs) {
      const row = rows[cursor++];
      try {
        const r = await processAdMedia(row, { includeVideo: opts.includeVideo, deadline });
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

function emptySummary(): Omit<DrainSummary, "remaining"> {
  return { processed: 0, imagesCopied: 0, videosCopied: 0, deduped: 0, failed: 0, elapsedMs: 0 };
}

function addSummaries(
  a: Omit<DrainSummary, "remaining">,
  b: Omit<DrainSummary, "remaining">,
): Omit<DrainSummary, "remaining"> {
  return {
    processed: a.processed + b.processed,
    imagesCopied: a.imagesCopied + b.imagesCopied,
    videosCopied: a.videosCopied + b.videosCopied,
    deduped: a.deduped + b.deduped,
    failed: a.failed + b.failed,
    elapsedMs: a.elapsedMs + b.elapsedMs,
  };
}

/**
 * Copia a mídia de anúncios específicos (logo após a coleta). Duas fases no
 * mesmo orçamento: primeiro TODAS as imagens (rápidas, nunca ficam para trás
 * por causa de um vídeo lento), depois os vídeos com o tempo que sobrar. O
 * que não couber fica em pending_video e é drenado pelo /api/media/persist.
 */
export async function persistMediaForIds(
  ids: string[],
  opts: { budgetMs?: number; includeVideo?: boolean } = {},
): Promise<Omit<DrainSummary, "remaining">> {
  if (!ids.length) return emptySummary();
  const budgetMs = opts.budgetMs ?? 9_000;
  const started = Date.now();
  const withRetry = await hasRetryColumns();
  const fetchRows = async () => {
    const { data, error } = await supabaseAdmin
      .from("collected_ads")
      .select(withRetry ? `${BASE_COLS}, media_attempts` : BASE_COLS)
      .in("id", ids);
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as MediaRow[];
  };

  const rows = (await fetchRows()).filter(
    (r) => (r.image_url && !r.image_storage_path) || (r.video_url && !r.video_storage_path),
  );
  const images = await runWithBudget(rows, {
    includeVideo: false,
    budgetMs,
    concurrency: 4,
  });
  if (!opts.includeVideo) return images;

  const left = budgetMs - (Date.now() - started);
  if (left < MIN_VIDEO_WINDOW_MS) return images;
  const videoRows = (await fetchRows()).filter((r) => r.video_url && !r.video_storage_path);
  const videos = await runWithBudget(videoRows, {
    includeVideo: true,
    budgetMs: left,
    concurrency: 2,
  });
  return addSummaries(images, videos);
}

/**
 * Esvazia a fila pendente, mais recentes primeiro.
 *  - mode "all"    (padrão): not_attempted + pending_video
 *  - mode "videos": só pending_video (caminho de retry dedicado para vídeos)
 * Seguro e limitado: lote pequeno, orçamento de tempo, backoff entre
 * tentativas e desistência após MAX_ATTEMPTS.
 */
export async function drainMediaQueue(
  opts: {
    budgetMs?: number;
    batch?: number;
    includeVideo?: boolean;
    mode?: "all" | "videos";
  } = {},
): Promise<DrainSummary> {
  const withRetry = await hasRetryColumns();
  const statuses = opts.mode === "videos" ? ["pending_video"] : ["not_attempted", "pending_video"];
  let q = supabaseAdmin
    .from("collected_ads")
    .select(withRetry ? `${BASE_COLS}, media_attempts` : BASE_COLS)
    .in("media_status", statuses)
    // Menos tentativas primeiro: um vídeo problemático não bloqueia os outros.
    .order(withRetry ? "media_attempts" : "last_seen_at", {
      ascending: withRetry,
      nullsFirst: withRetry,
    })
    .order("last_seen_at", { ascending: false, nullsFirst: false })
    .limit(Math.min(Math.max(opts.batch ?? 24, 1), 50));
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
    concurrency: opts.mode === "videos" ? 2 : 3,
  });
  const { count } = await supabaseAdmin
    .from("collected_ads")
    .select("id", { count: "exact", head: true })
    .in("media_status", statuses);
  return { ...summary, remaining: count ?? null };
}
